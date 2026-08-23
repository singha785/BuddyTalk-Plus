import type { NextFunction, Request, Response } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}

function extractBearer(req: Request): string | null {
  const header = req.header("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export async function loadUserFromBearer(req: Request): Promise<User | null> {
  const token = extractBearer(req);
  if (!token) return null;

  const rows = await db
    .select({
      user: usersTable,
      session: sessionsTable,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(
      and(
        eq(sessionsTable.token, token),
        gt(sessionsTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  req.sessionToken = token;
  req.user = row.user;
  return row.user;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await loadUserFromBearer(req);
  if (!user) {
    res.status(401).json({
      error: "unauthenticated",
      message: "Missing or invalid Authorization header",
    });
    return;
  }
  next();
}
