import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { UpdateMeBody } from "@workspace/api-zod";

import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.patch("/users/me", requireAuth, async (req, res) => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_request",
      message: parsed.error.message,
    });
    return;
  }
  const data = parsed.data;
  const userId = req.user!.id;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updates["name"] = data.name.trim();
  if (data.level !== undefined) updates["level"] = data.level;
  if (data.goal !== undefined) updates["goal"] = data.goal;
  if (data.interests !== undefined) updates["interests"] = data.interests;
  if (data.onboarded !== undefined) updates["onboarded"] = data.onboarded;
  if (data.role !== undefined) updates["role"] = data.role;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  res.json({
    id: updated.id,
    email: updated.email,
    emailVerified: updated.emailVerified,
    name: updated.name,
    role: updated.role,
    level: updated.level ?? null,
    goal: updated.goal ?? null,
    region: updated.region,
    interests: updated.interests ?? [],
    onboarded: updated.onboarded,
  });
});

export default router;
