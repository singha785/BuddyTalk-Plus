import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

import { requireAuth } from "../middlewares/requireAuth";
import { getIo } from "../socket";

/* ──────────────────────────────────────────────────────────────────────────
 * LEADERBOARD CONFIG - change the numbers here and redeploy.
 * ────────────────────────────────────────────────────────────────────────── */
export const LB_CONFIG = {
  topN: 50, // how many players the list shows
  maxPointsPerSubmit: 150, // one finished round can never add more than this
  minSecondsBetweenSubmits: 3, // same player + same game
  dailyPointCap: 2500, // most points one player can add per (UTC) day
};

const router: IRouter = Router();

const rowsOf = (r: any): any[] => (Array.isArray(r) ? r : r?.rows ?? []);
const utcDay = () => new Date().toISOString().slice(0, 10);

/** ISO week of the year in UTC, e.g. "2026-W46". The weekly board restarts every Monday. */
function weekId(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Shows "Rahul S." instead of the full name on a public board. */
function publicName(name: string): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Player";
  const first = parts[0].slice(0, 14);
  return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
}

// Changes whenever any score is added, so phones can ask "anything new?" very cheaply.
const BOOT = Date.now().toString(36);
let counter = 0;
const currentVersion = () => `${weekId()}:${BOOT}:${counter}`;

let tablesReady: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      await db.execute(sql`
        create table if not exists game_scores (
          id uuid primary key,
          user_id uuid not null references users(id) on delete cascade,
          game text not null,
          points integer not null,
          week text not null,
          day text not null,
          created_at timestamptz not null default now()
        )`);
      await db.execute(sql`create index if not exists game_scores_week_idx on game_scores (week, user_id)`);
      await db.execute(sql`create index if not exists game_scores_user_idx on game_scores (user_id, created_at desc)`);
    })().catch((e) => {
      tablesReady = null;
      throw e;
    });
  }
  return tablesReady;
}

/* ── POST /leaderboard/score  { game, points } ───────────────────────────── */
router.post("/leaderboard/score", requireAuth, async (req, res, next) => {
  try {
    await ensureTables();
    const userId = req.user!.id;
    const game = String(req.body?.game ?? "").toLowerCase();
    if (!/^[a-z0-9-]{2,32}$/.test(game)) {
      res.status(400).json({ error: "bad_game" });
      return;
    }
    const asked = Math.floor(Number(req.body?.points));
    if (!Number.isFinite(asked) || asked < 1) {
      res.status(400).json({ error: "bad_points" });
      return;
    }
    const points = Math.min(asked, LB_CONFIG.maxPointsPerSubmit);
    const week = weekId();
    const day = utcDay();

    const out = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"lb:" + userId}))`);

      const last = rowsOf(
        await tx.execute(
          sql`select created_at from game_scores where user_id = ${userId}::uuid and game = ${game} order by created_at desc limit 1`,
        ),
      );
      if (last.length && Date.now() - new Date(last[0].created_at).getTime() < LB_CONFIG.minSecondsBetweenSubmits * 1000) {
        return { added: 0, reason: "too_fast" as const };
      }

      const today = rowsOf(
        await tx.execute(sql`select coalesce(sum(points), 0)::int as s from game_scores where user_id = ${userId}::uuid and day = ${day}`),
      );
      const room = LB_CONFIG.dailyPointCap - Number(today[0]?.s ?? 0);
      if (room <= 0) return { added: 0, reason: "daily_cap" as const };

      const add = Math.min(points, room);
      await tx.execute(
        sql`insert into game_scores (id, user_id, game, points, week, day) values (${randomUUID()}::uuid, ${userId}::uuid, ${game}, ${add}, ${week}, ${day})`,
      );
      return { added: add, reason: null };
    });

    if (out.added > 0) {
      counter += 1;
      // If the realtime socket server is attached to the app, tell open leaderboards right away.
      try {
        getIo().to("leaderboard").emit("leaderboard_update", { version: currentVersion() });
      } catch {
        // optional
      }
    }
    res.json({ ...out, version: currentVersion() });
  } catch (err) {
    next(err);
  }
});

/* ── GET /leaderboard?period=week|all&since=<version> ───────────────────── */
router.get("/leaderboard", requireAuth, async (req, res, next) => {
  try {
    await ensureTables();
    const uid = req.user!.id;
    const period = req.query.period === "all" ? "all" : "week";
    const version = currentVersion();

    if (String(req.query.since ?? "") === version) {
      res.json({ version, changed: false, serverTime: Date.now() });
      return;
    }

    const week = weekId();
    const scope = period === "all" ? sql`true` : sql`week = ${week}`;

    const top = rowsOf(
      await db.execute(sql`
        select u.id, u.name, u.level, u.region, t.points, t.games, t.last_at
        from (
          select user_id, sum(points)::int as points, count(*)::int as games, max(created_at) as last_at
          from game_scores where ${scope} group by user_id
        ) t
        join users u on u.id = t.user_id
        order by t.points desc, t.last_at asc
        limit ${LB_CONFIG.topN}`),
    );

    const meRows = rowsOf(
      await db.execute(sql`
        with totals as (
          select user_id, sum(points)::int as p from game_scores where ${scope} group by user_id
        ), mine as (
          select coalesce((select p from totals where user_id = ${uid}::uuid), 0) as p
        )
        select (select p from mine) as points,
               (select count(*)::int from totals where p > (select p from mine)) + 1 as rank,
               (select min(p) from totals where p > (select p from mine)) as next_points,
               (select count(*)::int from totals) as players`),
    );
    const meName = rowsOf(await db.execute(sql`select name from users where id = ${uid}::uuid`));

    const recent = rowsOf(
      await db.execute(sql`
        select u.name, g.game, g.points, g.created_at
        from game_scores g join users u on u.id = g.user_id
        order by g.created_at desc limit 6`),
    );

    const mePoints = Number(meRows[0]?.points ?? 0);
    res.json({
      version,
      changed: true,
      period,
      week,
      serverTime: Date.now(),
      entries: top.map((r, i) => ({
        rank: i + 1,
        userId: String(r.id),
        name: publicName(r.name),
        level: r.level ? String(r.level) : null,
        region: r.region ? String(r.region) : null,
        points: Number(r.points),
        games: Number(r.games),
        lastPlayedAt: new Date(r.last_at).toISOString(),
        isMe: String(r.id) === uid,
      })),
      me: {
        name: publicName(meName[0]?.name ?? "You"),
        points: mePoints,
        rank: mePoints > 0 ? Number(meRows[0]?.rank ?? 0) : null,
        nextPoints: meRows[0]?.next_points != null ? Number(meRows[0].next_points) : null,
        players: Number(meRows[0]?.players ?? 0),
      },
      recent: recent.map((r) => ({
        name: publicName(r.name),
        game: String(r.game),
        points: Number(r.points),
        at: new Date(r.created_at).toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
