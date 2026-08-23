import { randomBytes } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq, and, isNull, gt } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  usersTable,
  sessionsTable,
  magicLinksTable,
  passwordResetTokensTable,
  phoneOtpTable,
  type User,
} from "@workspace/db";
import {
  SignupBody,
  LoginBody,
  RequestMagicLinkBody,
  VerifyMagicLinkBody,
} from "@workspace/api-zod";

import {
  hashPassword,
  verifyPassword,
  generateToken,
  SESSION_TTL_MS,
  MAGIC_LINK_TTL_MS,
} from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const RESET_CODE_TTL_MS = 1000 * 60 * 15;  // 15 minutes
const OTP_TTL_MS = 1000 * 60 * 10;          // 10 minutes

/** Generate a cryptographically random N-digit numeric code. */
function generateNumericCode(digits = 6): string {
  const buf = randomBytes(4);
  const num = buf.readUInt32BE(0);
  const max = Math.pow(10, digits);
  const min = Math.pow(10, digits - 1);
  return String(min + (num % (max - min))).slice(0, digits);
}

/** Normalize a phone number to digits-only string (e.g. "+1 (555) 123-4567" → "15551234567"). */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Synthetic email used for phone-only accounts. */
function phoneEmail(normalizedPhone: string): string {
  return `${normalizedPhone}@buddytalk.phone`;
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

// ── Email / Password ─────────────────────────────────────────────────────────

router.post("/auth/signup", async (req, res, next) => {
  try {
    const parsed = SignupBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: parsed.error.message });
      return;
    }
    const { email, password, name } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "email_taken", message: "Email already registered" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(usersTable)
      .values({ email: normalizedEmail, passwordHash, name: name.trim(), emailVerified: false })
      .returning();

    const session = await createSession(user.id);
    req.log.info({ userId: user.id }, "user signed up");
    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user: toProfile(user) });
  } catch (err) { next(err); }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: parsed.error.message });
      return;
    }
    const { email, password } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "invalid_credentials", message: "Wrong email or password" });
      return;
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "invalid_credentials", message: "Wrong email or password" });
      return;
    }

    const session = await createSession(user.id);
    req.log.info({ userId: user.id }, "user logged in");
    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user: toProfile(user) });
  } catch (err) { next(err); }
});

// ── Magic link ───────────────────────────────────────────────────────────────

router.post("/auth/magic-link", async (req, res, next) => {
  try {
    const parsed = RequestMagicLinkBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: parsed.error.message });
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();
    const token = generateToken(24);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

    await db.insert(magicLinksTable).values({ token, email, expiresAt });

    const isDev = process.env["NODE_ENV"] !== "production";
    req.log.info({ email, token: isDev ? token : "[hidden]" }, "magic link issued");
    res.json({ sent: true, devToken: isDev ? token : null });
  } catch (err) { next(err); }
});

router.post("/auth/magic-link/verify", async (req, res, next) => {
  try {
    const parsed = VerifyMagicLinkBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: parsed.error.message });
      return;
    }
    const { token } = parsed.data;

    const [link] = await db
      .select()
      .from(magicLinksTable)
      .where(and(eq(magicLinksTable.token, token), gt(magicLinksTable.expiresAt, new Date()), isNull(magicLinksTable.usedAt)))
      .limit(1);

    if (!link) {
      res.status(401).json({ error: "invalid_token", message: "Magic link is invalid or expired" });
      return;
    }

    await db.update(magicLinksTable).set({ usedAt: new Date() }).where(eq(magicLinksTable.token, token));

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, link.email)).limit(1);
    if (!user) {
      [user] = await db.insert(usersTable).values({ email: link.email, name: "", emailVerified: true }).returning();
    } else if (!user.emailVerified) {
      [user] = await db.update(usersTable).set({ emailVerified: true, updatedAt: new Date() }).where(eq(usersTable.id, user.id)).returning();
    }

    const session = await createSession(user.id);
    req.log.info({ userId: user.id }, "user verified magic link");
    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user: toProfile(user) });
  } catch (err) { next(err); }
});

// ── Forgot / Reset password ──────────────────────────────────────────────────

const ForgotPasswordBody = z.object({ email: z.string().email() });

router.post("/auth/forgot-password", async (req, res, next) => {
  try {
    const parsed = ForgotPasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: parsed.error.message });
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();
    const code = generateNumericCode(6);
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);

    // Delete any previous unused codes for this email (keep it tidy)
    await db.delete(passwordResetTokensTable).where(
      and(eq(passwordResetTokensTable.email, email), isNull(passwordResetTokensTable.usedAt)),
    );
    await db.insert(passwordResetTokensTable).values({ code, email, expiresAt });

    const isDev = process.env["NODE_ENV"] !== "production";
    req.log.info({ email, code: isDev ? code : "[hidden]" }, "password reset code issued");

    // TODO: send email with reset code via your email provider
    // Example: await sendEmail(email, `Your BuddyTalk+ reset code is: ${code}`);

    res.json({ sent: true, devCode: isDev ? code : null });
  } catch (err) { next(err); }
});

const ResetPasswordBody = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8),
});

router.post("/auth/reset-password", async (req, res, next) => {
  try {
    const parsed = ResetPasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: parsed.error.message });
      return;
    }
    const { email, code, newPassword } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const [record] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.email, normalizedEmail),
          eq(passwordResetTokensTable.code, code),
          gt(passwordResetTokensTable.expiresAt, new Date()),
          isNull(passwordResetTokensTable.usedAt),
        ),
      )
      .limit(1);

    if (!record) {
      res.status(401).json({ error: "invalid_code", message: "Reset code is invalid or expired" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
    if (!user) {
      res.status(404).json({ error: "user_not_found", message: "No account found with that email" });
      return;
    }

    const passwordHash = await hashPassword(newPassword);
    await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, user.id));
    await db.update(passwordResetTokensTable).set({ usedAt: new Date() }).where(eq(passwordResetTokensTable.id, record.id));

    // Auto-sign-in after password reset
    const session = await createSession(user.id);
    req.log.info({ userId: user.id }, "user reset password");
    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user: toProfile(user) });
  } catch (err) { next(err); }
});

// ── Phone OTP ────────────────────────────────────────────────────────────────

const SendOTPBody = z.object({
  phone: z.string().min(7).max(20),
  purpose: z.enum(["signin", "signup"]),
});

router.post("/auth/otp/send", async (req, res, next) => {
  try {
    const parsed = SendOTPBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: parsed.error.message });
      return;
    }
    const phone = normalizePhone(parsed.data.phone);
    const { purpose } = parsed.data;

    if (phone.length < 7) {
      res.status(400).json({ error: "invalid_phone", message: "Invalid phone number" });
      return;
    }

    const code = generateNumericCode(6);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Clean up old unused codes for this phone
    await db.delete(phoneOtpTable).where(
      and(eq(phoneOtpTable.phone, phone), isNull(phoneOtpTable.usedAt)),
    );
    await db.insert(phoneOtpTable).values({ phone, code, purpose, expiresAt });

    const isDev = process.env["NODE_ENV"] !== "production";
    req.log.info({ phone: `...${phone.slice(-4)}`, code: isDev ? code : "[hidden]" }, "phone OTP issued");

    // TODO: plug in SMS provider to deliver code
    // Example with Twilio:
    //   await twilioClient.messages.create({
    //     body: `Your BuddyTalk+ code is: ${code}. Valid for 10 minutes.`,
    //     from: process.env.TWILIO_FROM,
    //     to: `+${phone}`,
    //   });

    res.json({ sent: true, devOtp: isDev ? code : null });
  } catch (err) { next(err); }
});

const VerifyOTPBody = z.object({
  phone: z.string().min(7).max(20),
  code: z.string().length(6),
  name: z.string().optional(),
});

router.post("/auth/otp/verify", async (req, res, next) => {
  try {
    const parsed = VerifyOTPBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", message: parsed.error.message });
      return;
    }
    const phone = normalizePhone(parsed.data.phone);
    const { code, name } = parsed.data;

    const [otp] = await db
      .select()
      .from(phoneOtpTable)
      .where(
        and(
          eq(phoneOtpTable.phone, phone),
          eq(phoneOtpTable.code, code),
          gt(phoneOtpTable.expiresAt, new Date()),
          isNull(phoneOtpTable.usedAt),
        ),
      )
      .limit(1);

    if (!otp) {
      res.status(401).json({ error: "invalid_otp", message: "OTP is incorrect or expired" });
      return;
    }

    await db.update(phoneOtpTable).set({ usedAt: new Date() }).where(eq(phoneOtpTable.id, otp.id));

    const syntheticEmail = phoneEmail(phone);
    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, syntheticEmail)).limit(1);

    if (!user) {
      // New user — create account
      [user] = await db
        .insert(usersTable)
        .values({ email: syntheticEmail, name: (name ?? "").trim() || "User", emailVerified: true })
        .returning();
    } else if (name && !user.name) {
      [user] = await db
        .update(usersTable)
        .set({ name: name.trim(), updatedAt: new Date() })
        .where(eq(usersTable.id, user.id))
        .returning();
    }

    const session = await createSession(user.id);
    req.log.info({ userId: user.id, purpose: otp.purpose }, "user verified phone OTP");
    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user: toProfile(user) });
  } catch (err) { next(err); }
});

// ── Session management ───────────────────────────────────────────────────────

router.post("/auth/logout", requireAuth, async (req, res, next) => {
  try {
    if (req.sessionToken) {
      await db.delete(sessionsTable).where(eq(sessionsTable.token, req.sessionToken));
    }
    res.status(204).send();
  } catch (err) { next(err); }
});

router.get("/auth/me", requireAuth, async (req, res, next) => {
  try {
    res.json(toProfile(req.user!));
  } catch (err) { next(err); }
});

export default router;
