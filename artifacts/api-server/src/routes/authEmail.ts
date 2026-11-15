import { randomInt } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq, and, isNull, gt, desc } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  usersTable,
  sessionsTable,
  passwordResetTokensTable,
  emailOtpsTable,
  type User,
} from "@workspace/db";
import { hashPassword, generateToken, SESSION_TTL_MS } from "../lib/auth";
import { sendOtpEmail } from "../lib/mail";
import { OAuth2Client } from "google-auth-library";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const OTP_TTL_MS = 1000 * 60 * 10;
const RESET_TTL_MS = 1000 * 60 * 15;
const RESEND_COOLDOWN_MS = 1000 * 30;
const MAX_ATTEMPTS = 5;

function newCode(): string {
  return String(randomInt(100000, 1000000));
}

function toProfile(user: User) {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    role: user.role,
    level: user.level ?? null,
    goal: user.goal ?? null,
    region: user.region,
    interests: user.interests ?? [],
    onboarded: user.onboarded,
  };
}

async function createSession(userId: string) {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({ token, userId, expiresAt });
  return { token, expiresAt };
}

// ── Signup step 1: send OTP to email ─────────────────────────────────────────
const SendOtpBody = z.object({ email: z.string().email() });

router.post("/auth/signup/send-otp", async (req, res, next) => {
  try {
    const parsed = SendOtpBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: "Enter a valid email" });
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();

    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "email_taken", message: "Email already registered. Please log in." });
      return;
    }

    const [last] = await db
      .select()
      .from(emailOtpsTable)
      .where(and(eq(emailOtpsTable.email, email), eq(emailOtpsTable.purpose, "signup"), isNull(emailOtpsTable.usedAt)))
      .orderBy(desc(emailOtpsTable.createdAt))
      .limit(1);
    if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      res.status(429).json({ error: "too_soon", message: "Please wait 30 seconds before requesting another code." });
      return;
    }

    const code = newCode();
    await db.delete(emailOtpsTable).where(and(eq(emailOtpsTable.email, email), eq(emailOtpsTable.purpose, "signup")));
    await db.insert(emailOtpsTable).values({ email, code, purpose: "signup", expiresAt: new Date(Date.now() + OTP_TTL_MS) });

    try {
      await sendOtpEmail(email, code, "signup", 10);
    } catch (mailErr) {
      req.log.error({ err: mailErr }, "failed to send signup OTP email");
      await db.delete(emailOtpsTable).where(and(eq(emailOtpsTable.email, email), eq(emailOtpsTable.purpose, "signup")));
      res.status(502).json({ error: "mail_failed", message: "Could not send the email. Please try again." });
      return;
    }

    req.log.info({ email }, "signup OTP emailed");
    res.json({ sent: true });
  } catch (err) { next(err); }
});

// ── Signup step 2: verify OTP + create account ───────────────────────────────
const SignupWithOtpBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(80),
  // Optional: sign-up no longer needs an email code. Old app versions may still send one.
  otp: z.string().length(6).optional(),
});

router.post("/auth/signup", async (req, res, next) => {
  try {
    const parsed = SignupWithOtpBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: "Enter your name, a valid email and a password of 8+ characters." });
      return;
    }
    const { password, name, otp } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "email_taken", message: "Email already registered. Please log in." });
      return;
    }

    // Account is created with just email + password. If an old app still sends a valid
    // signup code we honour it and mark the email verified; otherwise it starts unverified
    // and the user can verify later from the Profile screen.
    let verified = false;
    if (otp) {
      const [record] = await db
        .select()
        .from(emailOtpsTable)
        .where(
          and(
            eq(emailOtpsTable.email, email),
            eq(emailOtpsTable.purpose, "signup"),
            isNull(emailOtpsTable.usedAt),
            gt(emailOtpsTable.expiresAt, new Date()),
          ),
        )
        .orderBy(desc(emailOtpsTable.createdAt))
        .limit(1);
      if (record && record.attempts < MAX_ATTEMPTS && record.code === otp) {
        await db.update(emailOtpsTable).set({ usedAt: new Date() }).where(eq(emailOtpsTable.id, record.id));
        verified = true;
      }
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(usersTable)
      .values({ email, passwordHash, name: name.trim(), emailVerified: verified })
      .returning();

    const session = await createSession(user.id);
    req.log.info({ userId: user.id }, "user signed up");
    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user: toProfile(user) });
  } catch (err) { next(err); }
});

// ── Optional email verification (from Profile, any time after sign-up) ───────
router.post("/auth/verify-email/send", requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    if (user.emailVerified) {
      res.json({ sent: false, alreadyVerified: true });
      return;
    }
    if (user.email.endsWith("@buddytalk.phone")) {
      res.status(400).json({ error: "no_email", message: "This account has no email address to verify." });
      return;
    }
    const email = user.email.trim().toLowerCase();

    const [last] = await db
      .select()
      .from(emailOtpsTable)
      .where(and(eq(emailOtpsTable.email, email), eq(emailOtpsTable.purpose, "verify"), isNull(emailOtpsTable.usedAt)))
      .orderBy(desc(emailOtpsTable.createdAt))
      .limit(1);
    if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      res.status(429).json({ error: "too_soon", message: "Please wait 30 seconds before requesting another code." });
      return;
    }

    const code = newCode();
    await db.delete(emailOtpsTable).where(and(eq(emailOtpsTable.email, email), eq(emailOtpsTable.purpose, "verify")));
    await db.insert(emailOtpsTable).values({ email, code, purpose: "verify", expiresAt: new Date(Date.now() + OTP_TTL_MS) });

    try {
      await sendOtpEmail(email, code, "signup", 10);
    } catch (mailErr) {
      req.log.error({ err: mailErr }, "failed to send verify-email OTP");
      await db.delete(emailOtpsTable).where(and(eq(emailOtpsTable.email, email), eq(emailOtpsTable.purpose, "verify")));
      res.status(502).json({ error: "mail_failed", message: "Could not send the email. Please try again." });
      return;
    }
    req.log.info({ userId: user.id }, "verify-email code emailed");
    res.json({ sent: true, alreadyVerified: false });
  } catch (err) { next(err); }
});

const ConfirmVerifyBody = z.object({ code: z.string().length(6) });

router.post("/auth/verify-email/confirm", requireAuth, async (req, res, next) => {
  try {
    const parsed = ConfirmVerifyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: "Enter the 6-digit code." });
      return;
    }
    const user = req.user!;
    const email = user.email.trim().toLowerCase();

    if (user.emailVerified) {
      res.json({ verified: true, user: toProfile(user) });
      return;
    }

    const [record] = await db
      .select()
      .from(emailOtpsTable)
      .where(
        and(
          eq(emailOtpsTable.email, email),
          eq(emailOtpsTable.purpose, "verify"),
          isNull(emailOtpsTable.usedAt),
          gt(emailOtpsTable.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(emailOtpsTable.createdAt))
      .limit(1);

    if (!record) {
      res.status(401).json({ error: "invalid_otp", message: "Code expired. Please request a new one." });
      return;
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      res.status(429).json({ error: "too_many_attempts", message: "Too many wrong attempts. Please request a new code." });
      return;
    }
    if (record.code !== parsed.data.code) {
      await db.update(emailOtpsTable).set({ attempts: record.attempts + 1 }).where(eq(emailOtpsTable.id, record.id));
      res.status(401).json({ error: "invalid_otp", message: "Wrong code. Please check your email and try again." });
      return;
    }

    await db.update(emailOtpsTable).set({ usedAt: new Date() }).where(eq(emailOtpsTable.id, record.id));
    const [updated] = await db
      .update(usersTable)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();
    req.log.info({ userId: user.id }, "email verified");
    res.json({ verified: true, user: toProfile(updated) });
  } catch (err) { next(err); }
});

// ── Forgot password: email the reset code ────────────────────────────────────
router.post("/auth/forgot-password", async (req, res, next) => {
  try {
    const parsed = SendOtpBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: "Enter a valid email" });
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();

    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (user) {
      const code = newCode();
      await db.delete(passwordResetTokensTable).where(
        and(eq(passwordResetTokensTable.email, email), isNull(passwordResetTokensTable.usedAt)),
      );
      await db.insert(passwordResetTokensTable).values({ code, email, expiresAt: new Date(Date.now() + RESET_TTL_MS) });

      try {
        await sendOtpEmail(email, code, "reset", 15);
        req.log.info({ email }, "password reset code emailed");
      } catch (mailErr) {
        req.log.error({ err: mailErr }, "failed to send reset email");
        res.status(502).json({ error: "mail_failed", message: "Could not send the email. Please try again." });
        return;
      }
    }

    // Same response whether or not the account exists (no email enumeration)
    res.json({ sent: true, devCode: null, fallbackCode: null, recoveryLink: null });
  } catch (err) { next(err); }
});

// ── Phone OTP is removed ─────────────────────────────────────────────────────
const phoneGone = (_req: any, res: any) => {
  res.status(410).json({ error: "phone_login_removed", message: "Phone login is no longer supported. Please use your email." });
};
router.post("/auth/otp/send", phoneGone);
router.post("/auth/otp/verify", phoneGone);

// -- Google sign-in: the app sends Google's ID token, we verify it here ---------
const googleClient = new OAuth2Client();
const GoogleBody = z.object({ idToken: z.string().min(20).max(4096) });

router.post("/auth/google", async (req, res, next) => {
  try {
    const parsed = GoogleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: "Missing Google token" });
      return;
    }
    const audiences = (process.env["GOOGLE_CLIENT_IDS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (audiences.length === 0) {
      res.status(503).json({ error: "google_not_configured", message: "Google sign-in is not set up on the server yet." });
      return;
    }

    let email = "";
    let name = "";
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: parsed.data.idToken, audience: audiences });
      const p = ticket.getPayload();
      if (!p || !p.email || p.email_verified !== true) {
        res.status(401).json({ error: "invalid_google_token", message: "Your Google email is not verified." });
        return;
      }
      email = p.email.trim().toLowerCase();
      name = (p.name ?? "").trim();
    } catch {
      res.status(401).json({ error: "invalid_google_token", message: "Google sign-in could not be verified. Please try again." });
      return;
    }

    const found = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    let user: User | undefined = found[0];

    if (!user) {
      const [created] = await db
        .insert(usersTable)
        .values({ email, passwordHash: null, name: name || email.split("@")[0], emailVerified: true })
        .returning();
      user = created;
    } else if (!user.emailVerified) {
      // Google just proved this person owns the email. If someone else had registered it earlier with a
      // password (never verified), that password and its sessions are removed so it cannot be used.
      await db.delete(sessionsTable).where(eq(sessionsTable.userId, user.id));
      const [fixed] = await db
        .update(usersTable)
        .set({ emailVerified: true, passwordHash: null, updatedAt: new Date() })
        .where(eq(usersTable.id, user.id))
        .returning();
      user = fixed;
    }

    const session = await createSession(user.id);
    req.log.info({ userId: user.id }, "user signed in with Google");
    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user: toProfile(user) });
  } catch (err) { next(err); }
});

export default router;
