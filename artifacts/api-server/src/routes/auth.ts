import { Router, type IRouter } from "express";
import { eq, and, isNull, gt } from "drizzle-orm";
import {
  db,
  usersTable,
  sessionsTable,
  magicLinksTable,
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

router.post("/auth/signup", async (req, res) => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_request",
      message: parsed.error.message,
    });
    return;
  }
  const { email, password, name } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0) {
    res
      .status(409)
      .json({ error: "email_taken", message: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(usersTable)
    .values({
      email: normalizedEmail,
      passwordHash,
      name: name.trim(),
      emailVerified: false,
    })
    .returning();

  const session = await createSession(user.id);
  req.log.info({ userId: user.id }, "user signed up");

  res.json({
    token: session.token,
    expiresAt: session.expiresAt.toISOString(),
    user: toProfile(user),
  });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_request",
      message: parsed.error.message,
    });
    return;
  }
  const { email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  if (!user || !user.passwordHash) {
    res
      .status(401)
      .json({ error: "invalid_credentials", message: "Wrong email or password" });
    return;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    res
      .status(401)
      .json({ error: "invalid_credentials", message: "Wrong email or password" });
    return;
  }

  const session = await createSession(user.id);
  req.log.info({ userId: user.id }, "user logged in");

  res.json({
    token: session.token,
    expiresAt: session.expiresAt.toISOString(),
    user: toProfile(user),
  });
});

router.post("/auth/magic-link", async (req, res) => {
  const parsed = RequestMagicLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_request",
      message: parsed.error.message,
    });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const token = generateToken(24);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await db.insert(magicLinksTable).values({ token, email, expiresAt });

  // In dev we surface the token directly so users can sign in without SMTP.
  // In production, replace with email send (Resend / SES / SendGrid).
  const isDev = process.env["NODE_ENV"] !== "production";
  req.log.info(
    { email, token: isDev ? token : "[hidden]" },
    "magic link issued",
  );

  res.json({
    sent: true,
    devToken: isDev ? token : null,
  });
});

router.post("/auth/magic-link/verify", async (req, res) => {
  const parsed = VerifyMagicLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_request",
      message: parsed.error.message,
    });
    return;
  }
  const { token } = parsed.data;

  const [link] = await db
    .select()
    .from(magicLinksTable)
    .where(
      and(
        eq(magicLinksTable.token, token),
        gt(magicLinksTable.expiresAt, new Date()),
        isNull(magicLinksTable.usedAt),
      ),
    )
    .limit(1);

  if (!link) {
    res.status(401).json({
      error: "invalid_token",
      message: "Magic link is invalid or expired",
    });
    return;
  }

  // Mark used
  await db
    .update(magicLinksTable)
    .set({ usedAt: new Date() })
    .where(eq(magicLinksTable.token, token));

  // Find or create user
  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, link.email))
    .limit(1);

  if (!user) {
    [user] = await db
      .insert(usersTable)
      .values({
        email: link.email,
        name: "",
        emailVerified: true,
      })
      .returning();
  } else if (!user.emailVerified) {
    [user] = await db
      .update(usersTable)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();
  }

  const session = await createSession(user.id);
  req.log.info({ userId: user.id }, "user verified magic link");

  res.json({
    token: session.token,
    expiresAt: session.expiresAt.toISOString(),
    user: toProfile(user),
  });
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  if (req.sessionToken) {
    await db
      .delete(sessionsTable)
      .where(eq(sessionsTable.token, req.sessionToken));
  }
  res.status(204).send();
});

router.get("/auth/me", requireAuth, async (req, res) => {
  res.json(toProfile(req.user!));
});

export default router;
