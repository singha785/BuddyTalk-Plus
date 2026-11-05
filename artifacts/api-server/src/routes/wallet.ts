import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

import { requireAuth } from "../middlewares/requireAuth";

/* ──────────────────────────────────────────────────────────────────────────
 * COIN CONFIG  -  every number of the coin economy lives in this one block.
 * Change a value, redeploy, done. The phone app can never decide amounts.
 * ────────────────────────────────────────────────────────────────────────── */
export const COIN_CONFIG = {
  /** One-time gift on the very first wallet sync of an account. */
  signupBonus: 50,
  /** Everything a user can EARN in one (UTC) day, all reasons together. */
  dailyEarnCap: 200,
  earn: {
    /** Opening the app, once per day. */
    daily_login: { fixedAmount: 2, perDayCount: 1 },
    /** Daily tasks / missions. ref = task id, so one reward per task per day. */
    task: { maxPerGrant: 15, perDayCount: 12 },
    /** Rewarded ad. */
    ad: { fixedAmount: 15, perDayCount: 10 },
    /** Mini-games (bubble pop, tongue twister...) and anything else small. */
    bonus: { maxPerGrant: 20, perDayCount: 10 },
  } as Record<string, { fixedAmount?: number; maxPerGrant?: number; perDayCount: number }>,
  spend: {
    /** Mentor calls (price comes from the mentor list on the phone, so it is only capped here). */
    mentor_call: { max: 100 },
    /** Any other paid feature. */
    spend: { max: 200 },
  } as Record<string, { max: number }>,
};

const router: IRouter = Router();

/* ── tiny helpers ─────────────────────────────────────────────────────────── */
const rowsOf = (r: any): any[] => (Array.isArray(r) ? r : r?.rows ?? []);
const utcDay = () => new Date().toISOString().slice(0, 10);

let tablesReady: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      await db.execute(sql`
        create table if not exists coin_ledger (
          id uuid primary key,
          user_id uuid not null references users(id) on delete cascade,
          delta integer not null,
          reason text not null,
          ref text,
          note text,
          day text not null,
          balance_after integer not null,
          created_at timestamptz not null default now()
        )`);
      await db.execute(sql`create index if not exists coin_ledger_user_idx on coin_ledger (user_id, created_at desc)`);
      await db.execute(
        sql`create unique index if not exists coin_ledger_ref_uq on coin_ledger (user_id, reason, ref) where ref is not null`,
      );
    })().catch((e) => {
      tablesReady = null; // try again on the next request
      throw e;
    });
  }
  return tablesReady;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function balanceOf(tx: Tx, userId: string): Promise<number> {
  const r = rowsOf(
    await tx.execute(sql`select coalesce(sum(delta), 0)::int as bal from coin_ledger where user_id = ${userId}::uuid`),
  );
  return Number(r[0]?.bal ?? 0);
}

async function insertRow(
  tx: Tx,
  userId: string,
  delta: number,
  reason: string,
  ref: string | null,
  note: string | null,
  balanceAfter: number,
) {
  await tx.execute(sql`
    insert into coin_ledger (id, user_id, delta, reason, ref, note, day, balance_after)
    values (${randomUUID()}::uuid, ${userId}::uuid, ${delta}, ${reason}, ${ref}, ${note}, ${utcDay()}, ${balanceAfter})`);
}

async function lockUser(tx: Tx, userId: string) {
  // one wallet operation per user at a time, so two taps can never double-spend
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
}

const cleanRef = (v: unknown): string | null => {
  if (v === undefined || v === null || v === "") return null;
  return String(v).slice(0, 120);
};
const cleanNote = (v: unknown): string | null => (v ? String(v).slice(0, 160) : null);

/** First wallet sync of an account: give the signup bonus once. */
async function ensureSignupBonus(userId: string) {
  if (!COIN_CONFIG.signupBonus) return;
  await db.transaction(async (tx) => {
    await lockUser(tx, userId);
    const has = rowsOf(
      await tx.execute(sql`select 1 from coin_ledger where user_id = ${userId}::uuid and reason = 'signup_bonus' limit 1`),
    );
    if (has.length) return;
    const bal = await balanceOf(tx, userId);
    await insertRow(tx, userId, COIN_CONFIG.signupBonus, "signup_bonus", "signup", "Welcome bonus", bal + COIN_CONFIG.signupBonus);
  });
}

async function readWallet(userId: string) {
  const bal = rowsOf(
    await db.execute(sql`select coalesce(sum(delta), 0)::int as bal from coin_ledger where user_id = ${userId}::uuid`),
  );
  const tx = rowsOf(
    await db.execute(sql`
      select id, delta, reason, note, balance_after, created_at
      from coin_ledger where user_id = ${userId}::uuid
      order by created_at desc limit 30`),
  );
  const today = rowsOf(
    await db.execute(sql`
      select coalesce(sum(delta), 0)::int as earned from coin_ledger
      where user_id = ${userId}::uuid and day = ${utcDay()} and delta > 0 and reason <> 'signup_bonus'`),
  );
  return {
    balance: Number(bal[0]?.bal ?? 0),
    earnedToday: Number(today[0]?.earned ?? 0),
    dailyEarnCap: COIN_CONFIG.dailyEarnCap,
    transactions: tx.map((t) => ({
      id: String(t.id),
      delta: Number(t.delta),
      reason: String(t.reason),
      note: t.note ? String(t.note) : null,
      balanceAfter: Number(t.balance_after),
      createdAt: new Date(t.created_at).toISOString(),
    })),
  };
}

/* ── GET /wallet ──────────────────────────────────────────────────────────── */
router.get("/wallet", requireAuth, async (req, res, next) => {
  try {
    await ensureTables();
    const userId = req.user!.id;
    await ensureSignupBonus(userId);
    res.json(await readWallet(userId));
  } catch (err) {
    next(err);
  }
});

/* ── POST /wallet/earn  { reason, ref?, amount?, note? } ─────────────────── */
router.post("/wallet/earn", requireAuth, async (req, res, next) => {
  try {
    await ensureTables();
    const userId = req.user!.id;
    const reason = String(req.body?.reason ?? "");
    const rule = COIN_CONFIG.earn[reason];
    if (!rule) {
      res.status(400).json({ error: "unknown_reason", message: "This reward is not available." });
      return;
    }

    let amount: number;
    if (rule.fixedAmount !== undefined) {
      amount = rule.fixedAmount;
    } else {
      const asked = Math.floor(Number(req.body?.amount));
      if (!Number.isFinite(asked) || asked < 1) {
        res.status(400).json({ error: "bad_amount", message: "Invalid amount." });
        return;
      }
      amount = Math.min(asked, rule.maxPerGrant ?? 10);
    }

    const day = utcDay();
    // reward that can only be earned once a day per item (tasks, daily login) gets a day-stamped ref
    const rawRef = cleanRef(req.body?.ref);
    const ref = reason === "daily_login" ? `login:${day}` : reason === "task" ? `${rawRef ?? "task"}:${day}` : rawRef;
    const note = cleanNote(req.body?.note);

    const result = await db.transaction(async (tx) => {
      await lockUser(tx, userId);
      const bal = await balanceOf(tx, userId);

      if (ref) {
        const dup = rowsOf(
          await tx.execute(
            sql`select 1 from coin_ledger where user_id = ${userId}::uuid and reason = ${reason} and ref = ${ref} limit 1`,
          ),
        );
        if (dup.length) return { granted: 0, balance: bal, duplicate: true as const };
      }

      const countToday = rowsOf(
        await tx.execute(
          sql`select count(*)::int as c from coin_ledger where user_id = ${userId}::uuid and day = ${day} and reason = ${reason} and delta > 0`,
        ),
      );
      if (Number(countToday[0]?.c ?? 0) >= rule.perDayCount) {
        return { granted: 0, balance: bal, limited: "daily_count" as const };
      }

      const earnedToday = rowsOf(
        await tx.execute(
          sql`select coalesce(sum(delta), 0)::int as s from coin_ledger
              where user_id = ${userId}::uuid and day = ${day} and delta > 0 and reason <> 'signup_bonus'`,
        ),
      );
      const room = COIN_CONFIG.dailyEarnCap - Number(earnedToday[0]?.s ?? 0);
      if (room <= 0) return { granted: 0, balance: bal, limited: "daily_cap" as const };

      const give = Math.min(amount, room);
      await insertRow(tx, userId, give, reason, ref, note, bal + give);
      return { granted: give, balance: bal + give };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/* ── POST /wallet/spend  { reason, amount, ref?, note? } ─────────────────── */
router.post("/wallet/spend", requireAuth, async (req, res, next) => {
  try {
    await ensureTables();
    const userId = req.user!.id;
    const reason = String(req.body?.reason ?? "spend");
    const rule = COIN_CONFIG.spend[reason];
    if (!rule) {
      res.status(400).json({ error: "unknown_reason", message: "This purchase is not available." });
      return;
    }
    const amount = Math.floor(Number(req.body?.amount));
    if (!Number.isFinite(amount) || amount < 1 || amount > rule.max) {
      res.status(400).json({ error: "bad_amount", message: "Invalid amount." });
      return;
    }
    const ref = cleanRef(req.body?.ref);
    const note = cleanNote(req.body?.note);

    const out = await db.transaction(async (tx) => {
      await lockUser(tx, userId);
      const bal = await balanceOf(tx, userId);
      if (ref) {
        const dup = rowsOf(
          await tx.execute(
            sql`select 1 from coin_ledger where user_id = ${userId}::uuid and reason = ${reason} and ref = ${ref} limit 1`,
          ),
        );
        if (dup.length) return { ok: true as const, balance: bal, duplicate: true };
      }
      if (bal < amount) return { ok: false as const, balance: bal };
      await insertRow(tx, userId, -amount, reason, ref, note, bal - amount);
      return { ok: true as const, balance: bal - amount };
    });

    if (!out.ok) {
      res.status(402).json({ error: "insufficient_coins", message: "Not enough coins.", balance: out.balance });
      return;
    }
    res.json(out);
  } catch (err) {
    next(err);
  }
});

export default router;
