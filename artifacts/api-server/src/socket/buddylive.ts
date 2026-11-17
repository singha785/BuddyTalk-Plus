import type { Server as SocketServer, Socket } from "socket.io";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@workspace/db";

// BuddyLive v2: friends-only 1-to-1 text chat. All events are prefixed bl_ so they never clash with call events.
// Chat messages live in the database for RETENTION_DAYS days and are then deleted automatically.
// Friends, blocks, requests and conversations are never deleted by the cleanup.

type ConnectedLike = {
  socketId: string;
  userId: string;
  name: string;
  region: string;
  level: string | null;
  status: string;
};

type Log = {
  info: (obj: object, msg: string) => void;
  warn: (obj: object, msg: string) => void;
};

type Ack = (res: unknown) => void;

const MAX_LEN = 300;
const RETENTION_DAYS = 7;
const CLEANUP_EVERY_MS = 3 * 60 * 60 * 1000;
const SEND_WINDOW_MS = 10_000;
const SEND_MAX = 8;
const REQ_WINDOW_MS = 60_000;
const REQ_MAX = 10;
const REPORTS_PER_DAY = 5;
const COLORS = ["#FF7A45", "#5B3DFF", "#16A085", "#F5A524", "#E5484D", "#7C3AED"];
const REPORT_CATEGORIES = new Set(["spam", "harassment", "abusive", "fake_profile", "fraud", "inappropriate", "other"]);

// English-only chat: Hindi (Devanagari) and clear Hinglish are rejected. Same rule as the app, so old app versions cannot bypass it.
const HINGLISH = new Set(
  "kya nahi nahin nhi kaise kaisa kaisi kaun kab kyun kyu kyon kahan kaha kidhar hai hain hoon hun tha thi hoga hogi mujhe tumhe tujhe aapko aap tum mera meri mere tera teri tere uska uski apna apni bahut bohot bhot accha acha achha theek thik bilkul abhi aaj raat subah kaam ghar dost yaar bhai didi karna karo karte karti kiya karunga karungi raha rahi rahe gaya gayi chahiye chalo chal bolo bata batao samajh pata lekin magar aur toh wala wali wale kuch koi sab sabhi bas haan matlab zyada jyada thoda thodi khana paani pani kitna kitne kitni wahan yahan idhar udhar phir sirf bhi isliye kyunki".split(" "),
);
function notEnglish(s: string): boolean {
  if (/[\u0900-\u097F]/.test(s)) return true;
  const words = s.toLowerCase().match(/[a-z']+/g) ?? [];
  let hits = 0;
  for (const w of words) if (HINGLISH.has(w)) hits++;
  return hits >= 2;
}

/* ───────── database helpers ───────── */
async function q(query: SQL): Promise<any[]> {
  const r: any = await db.execute(query);
  return Array.isArray(r) ? r : (r?.rows ?? []);
}

const SCHEMA: SQL[] = [
  sql`create table if not exists bl_friend_requests (
    id uuid primary key default gen_random_uuid(),
    from_user_id uuid not null references users(id) on delete cascade,
    to_user_id uuid not null references users(id) on delete cascade,
    status text not null default 'pending',
    created_at timestamptz not null default now(),
    responded_at timestamptz,
    check (from_user_id <> to_user_id)
  )`,
  sql`create unique index if not exists bl_fr_pending_uniq on bl_friend_requests (from_user_id, to_user_id) where status = 'pending'`,
  sql`create index if not exists bl_fr_to_idx on bl_friend_requests (to_user_id, status)`,
  sql`create index if not exists bl_fr_from_idx on bl_friend_requests (from_user_id, status)`,
  sql`create table if not exists bl_friendships (
    user_a uuid not null references users(id) on delete cascade,
    user_b uuid not null references users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_a, user_b),
    check (user_a < user_b)
  )`,
  sql`create index if not exists bl_fs_b_idx on bl_friendships (user_b)`,
  sql`create table if not exists bl_blocks (
    blocker_id uuid not null references users(id) on delete cascade,
    blocked_id uuid not null references users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (blocker_id, blocked_id)
  )`,
  sql`create index if not exists bl_blocks_blocked_idx on bl_blocks (blocked_id)`,
  sql`create table if not exists bl_reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references users(id) on delete cascade,
    reported_user_id uuid not null references users(id) on delete cascade,
    category text not null,
    description text,
    status text not null default 'pending',
    created_at timestamptz not null default now(),
    reviewed_at timestamptz
  )`,
  sql`create index if not exists bl_reports_reported_idx on bl_reports (reported_user_id)`,
  sql`create index if not exists bl_reports_status_idx on bl_reports (status, created_at)`,
  sql`create table if not exists bl_conversations (
    id uuid primary key default gen_random_uuid(),
    user_a uuid not null references users(id) on delete cascade,
    user_b uuid not null references users(id) on delete cascade,
    created_at timestamptz not null default now(),
    last_message_at timestamptz,
    user_a_last_read_at timestamptz not null default now(),
    user_b_last_read_at timestamptz not null default now(),
    check (user_a < user_b)
  )`,
  sql`create unique index if not exists bl_conv_pair_uniq on bl_conversations (user_a, user_b)`,
  sql`create index if not exists bl_conv_a_idx on bl_conversations (user_a, last_message_at)`,
  sql`create index if not exists bl_conv_b_idx on bl_conversations (user_b, last_message_at)`,
  sql`create table if not exists bl_chat_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references bl_conversations(id) on delete cascade,
    sender_id uuid not null references users(id) on delete cascade,
    body text not null,
    client_id text,
    created_at timestamptz not null default now(),
    delivered_at timestamptz
  )`,
  sql`create index if not exists bl_cm_conv_idx on bl_chat_messages (conversation_id, created_at)`,
  sql`create unique index if not exists bl_cm_client_uniq on bl_chat_messages (sender_id, client_id) where client_id is not null`,
  sql`create table if not exists bl_suspensions (
    user_id uuid primary key references users(id) on delete cascade,
    reason text,
    created_at timestamptz not null default now(),
    until timestamptz
  )`,
];

const hits = new Map<string, number[]>();
function tooFast(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return true;
  }
  arr.push(now);
  hits.set(key, arr);
  return false;
}

async function cleanupOld(log: Log): Promise<void> {
  try {
    const r = await q(sql`with d as (delete from bl_chat_messages where created_at < now() - (${RETENTION_DAYS}::int * interval '1 day') returning 1) select count(*)::int as n from d`);
    const n = Number(r[0]?.n ?? 0);
    if (n > 0) log.info({ deleted: n, days: RETENTION_DAYS }, "BuddyLive: old chat messages deleted");
  } catch (err) {
    log.warn({ err: String(err) }, "BuddyLive: message cleanup failed");
  }
  try {
    await db.execute(sql`delete from bl_messages where created_at < now() - (${RETENTION_DAYS}::int * interval '1 day')`);
  } catch {
    /* legacy table may not exist */
  }
  try {
    await db.execute(sql`delete from bl_friend_requests where status <> 'pending' and created_at < now() - interval '30 days'`);
  } catch (err) {
    log.warn({ err: String(err) }, "BuddyLive: request cleanup failed");
  }
}

let readyPromise: Promise<void> | null = null;
function ready(log: Log): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      for (const stmt of SCHEMA) await db.execute(stmt);
      await cleanupOld(log);
      const t = setInterval(() => {
        hits.clear();
        void cleanupOld(log);
      }, CLEANUP_EVERY_MS);
      (t as { unref?: () => void }).unref?.();
      log.info({ days: RETENTION_DAYS }, "BuddyLive ready");
    })().catch((err) => {
      readyPromise = null;
      log.warn({ err: String(err) }, "BuddyLive setup failed");
      throw err;
    });
  }
  return readyPromise;
}

/* ───────── small helpers ───────── */
function color(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}
const idOf = (v: unknown): string | null => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v.toLowerCase() : null);
const pair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);
const ms = (v: unknown): number => new Date(v as string).getTime();

const friendCache = new Map<string, { v: boolean; t: number }>();
const fkey = (a: string, b: string) => pair(a, b).join("|");

async function areFriends(a: string, b: string, useCache = false): Promise<boolean> {
  const key = fkey(a, b);
  if (useCache) {
    const c = friendCache.get(key);
    if (c && Date.now() - c.t < 15_000) return c.v;
  }
  const [x, y] = pair(a, b);
  const r = await q(sql`select 1 as ok from bl_friendships where user_a = ${x}::uuid and user_b = ${y}::uuid`);
  const v = r.length > 0;
  friendCache.set(key, { v, t: Date.now() });
  return v;
}

async function isBlockedPair(a: string, b: string): Promise<boolean> {
  const r = await q(sql`select 1 as ok from bl_blocks where (blocker_id = ${a}::uuid and blocked_id = ${b}::uuid) or (blocker_id = ${b}::uuid and blocked_id = ${a}::uuid) limit 1`);
  return r.length > 0;
}

async function isSuspended(id: string): Promise<boolean> {
  const r = await q(sql`select 1 as ok from bl_suspensions where user_id = ${id}::uuid and (until is null or until > now()) limit 1`);
  return r.length > 0;
}

async function userRow(id: string): Promise<any | null> {
  const r = await q(sql`select id, name, region, level, interests from users where id = ${id}::uuid limit 1`);
  return r[0] ?? null;
}

export function registerBuddyLive(
  io: SocketServer,
  socket: Socket,
  meta: { userId: string; name: string },
  getConnected: () => Iterable<ConnectedLike>,
  log: Log,
): void {
  const me = meta.userId.toLowerCase();

  const findUser = (userId: string): ConnectedLike | null => {
    for (const u of getConnected()) if (u.userId === userId) return u;
    return null;
  };
  const isOnline = (userId: string) => {
    const u = findUser(userId);
    return !!u && u.status !== "offline";
  };
  const emitTo = (userId: string, event: string, payload: unknown): boolean => {
    const u = findUser(userId);
    if (u) io.to(u.socketId).emit(event, payload);
    return !!u;
  };
  const toBuddy = (r: any, relation?: string): Record<string, unknown> => {
    const id = String(r.id);
    return {
      userId: id,
      name: r.name || "Learner",
      region: r.region ?? "",
      level: r.level ?? "Beginner",
      color: color(id),
      interests: Array.isArray(r.interests) ? r.interests : [],
      relation,
      online: isOnline(id),
    };
  };

  // Every handler: works with (data, ack) and with (ack) only, never throws, always answers.
  const on = (event: string, fn: (data: any, reply: Ack) => Promise<void> | void) => {
    socket.on(event, (a?: unknown, b?: unknown) => {
      const ack: Ack | null = typeof a === "function" ? (a as Ack) : typeof b === "function" ? (b as Ack) : null;
      const data = a && typeof a === "object" ? a : {};
      const reply: Ack = (res) => {
        if (ack) ack(res);
      };
      void (async () => {
        try {
          await ready(log);
          await fn(data, reply);
        } catch (err) {
          log.warn({ err: String(err), event }, "BuddyLive handler failed");
          reply({ ok: false, error: "failed" });
        }
      })();
    });
  };

  const relationOf = async (other: string): Promise<string> => {
    if (await areFriends(me, other)) return "friends";
    const r = await q(sql`select from_user_id from bl_friend_requests where status = 'pending' and ((from_user_id = ${me}::uuid and to_user_id = ${other}::uuid) or (from_user_id = ${other}::uuid and to_user_id = ${me}::uuid)) limit 1`);
    if (!r[0]) return "none";
    return String(r[0].from_user_id) === me ? "request_sent" : "request_received";
  };

  const makeFriends = async (other: string) => {
    const [x, y] = pair(me, other);
    await db.execute(sql`update bl_friend_requests set status = 'accepted', responded_at = now() where status = 'pending' and ((from_user_id = ${me}::uuid and to_user_id = ${other}::uuid) or (from_user_id = ${other}::uuid and to_user_id = ${me}::uuid))`);
    await db.execute(sql`insert into bl_friendships (user_a, user_b) values (${x}::uuid, ${y}::uuid) on conflict do nothing`);
    friendCache.delete(fkey(me, other));
    const mine = await userRow(me);
    emitTo(other, "bl_friend_event", { type: "accepted", from: mine ? toBuddy(mine, "friends") : { userId: me } });
  };

  /* ───────── discovery ───────── */
  on("bl_list", async (d, reply) => {
    if (await isSuspended(me)) return reply({ ok: false, error: "suspended" });
    const skip = new Set<string>(Array.isArray(d.skip) ? d.skip.map((x: unknown) => String(x).toLowerCase()) : []);
    const [blockRows, suspRows, friendRows, pendRows] = await Promise.all([
      q(sql`select blocker_id, blocked_id from bl_blocks where blocker_id = ${me}::uuid or blocked_id = ${me}::uuid`),
      q(sql`select user_id from bl_suspensions where until is null or until > now()`),
      q(sql`select case when user_a = ${me}::uuid then user_b else user_a end as id from bl_friendships where user_a = ${me}::uuid or user_b = ${me}::uuid`),
      q(sql`select from_user_id, to_user_id from bl_friend_requests where status = 'pending' and (from_user_id = ${me}::uuid or to_user_id = ${me}::uuid)`),
    ]);
    const hidden = new Set<string>();
    for (const r of blockRows) hidden.add(String(r.blocker_id) === me ? String(r.blocked_id) : String(r.blocker_id));
    for (const r of suspRows) hidden.add(String(r.user_id));
    const friends = new Set<string>(friendRows.map((r) => String(r.id)));
    const sent = new Set<string>();
    const received = new Set<string>();
    for (const r of pendRows) {
      if (String(r.from_user_id) === me) sent.add(String(r.to_user_id));
      else received.add(String(r.from_user_id));
    }

    const cands: ConnectedLike[] = [];
    let online = 0;
    for (const u of getConnected()) {
      if (u.userId === me || u.status !== "live" || hidden.has(u.userId)) continue;
      online++;
      if (skip.has(u.userId)) continue;
      cands.push(u);
    }
    cands.sort((x, y) => Number(friends.has(y.userId)) - Number(friends.has(x.userId)) || x.name.localeCompare(y.name));
    const top = cands.slice(0, 50);

    const info = new Map<string, any>();
    if (top.length > 0) {
      const rows = await q(sql`select id, name, region, level, interests from users where id in (${sql.join(top.map((u) => sql`${u.userId}::uuid`), sql`, `)})`);
      for (const r of rows) info.set(String(r.id), r);
    }
    const buddies = top.map((u) => {
      const row = info.get(u.userId) ?? { id: u.userId, name: u.name, region: u.region, level: u.level };
      const rel = friends.has(u.userId) ? "friends" : sent.has(u.userId) ? "request_sent" : received.has(u.userId) ? "request_received" : "none";
      return { ...toBuddy(row, rel), online: true };
    });
    reply({ ok: true, online, buddies });
  });

  on("bl_profile", async (d, reply) => {
    const id = idOf(d.userId);
    if (!id) return reply({ ok: false, error: "invalid" });
    if (await isBlockedPair(me, id)) return reply({ ok: false, error: "blocked" });
    const row = await userRow(id);
    if (!row || (await isSuspended(id))) return reply({ ok: false, error: "unavailable" });
    const relation = await relationOf(id);
    reply({ ok: true, profile: toBuddy(row, relation), relation });
  });

  /* ───────── friends ───────── */
  on("bl_friend_request", async (d, reply) => {
    const to = idOf(d.userId);
    if (!to || to === me) return reply({ ok: false, error: "invalid" });
    if (tooFast(`fr:${me}`, REQ_WINDOW_MS, REQ_MAX)) return reply({ ok: false, error: "slow_down" });
    if (await isSuspended(me)) return reply({ ok: false, error: "suspended" });
    const other = await userRow(to);
    if (!other || (await isSuspended(to))) return reply({ ok: false, error: "unavailable" });
    if (await isBlockedPair(me, to)) return reply({ ok: false, error: "blocked" });
    const rel = await relationOf(to);
    if (rel === "friends") return reply({ ok: false, error: "already_friends" });
    if (rel === "request_sent") return reply({ ok: false, error: "already_sent" });
    if (rel === "request_received") {
      await makeFriends(to);
      return reply({ ok: true, relation: "friends" });
    }
    await db.execute(sql`insert into bl_friend_requests (from_user_id, to_user_id) values (${me}::uuid, ${to}::uuid) on conflict do nothing`);
    const mine = await userRow(me);
    emitTo(to, "bl_friend_event", { type: "request", from: mine ? toBuddy(mine, "request_received") : { userId: me } });
    reply({ ok: true, relation: "request_sent" });
  });

  on("bl_friend_accept", async (d, reply) => {
    const from = idOf(d.userId);
    if (!from || from === me) return reply({ ok: false, error: "invalid" });
    const rel = await relationOf(from);
    if (rel === "friends") return reply({ ok: true, relation: "friends" });
    if (rel !== "request_received") return reply({ ok: false, error: "no_request" });
    if (await isBlockedPair(me, from)) return reply({ ok: false, error: "blocked" });
    await makeFriends(from);
    reply({ ok: true, relation: "friends" });
  });

  on("bl_friend_reject", async (d, reply) => {
    const from = idOf(d.userId);
    if (!from) return reply({ ok: false, error: "invalid" });
    await db.execute(sql`update bl_friend_requests set status = 'rejected', responded_at = now() where status = 'pending' and from_user_id = ${from}::uuid and to_user_id = ${me}::uuid`);
    reply({ ok: true, relation: "none" });
  });

  on("bl_friend_cancel", async (d, reply) => {
    const to = idOf(d.userId);
    if (!to) return reply({ ok: false, error: "invalid" });
    await db.execute(sql`update bl_friend_requests set status = 'cancelled', responded_at = now() where status = 'pending' and from_user_id = ${me}::uuid and to_user_id = ${to}::uuid`);
    emitTo(to, "bl_friend_event", { type: "cancelled", from: { userId: me } });
    reply({ ok: true, relation: "none" });
  });

  on("bl_friend_remove", async (d, reply) => {
    const other = idOf(d.userId);
    if (!other) return reply({ ok: false, error: "invalid" });
    const [x, y] = pair(me, other);
    await db.execute(sql`delete from bl_friendships where user_a = ${x}::uuid and user_b = ${y}::uuid`);
    await db.execute(sql`delete from bl_conversations where user_a = ${x}::uuid and user_b = ${y}::uuid`);
    friendCache.delete(fkey(me, other));
    emitTo(other, "bl_friend_event", { type: "removed", from: { userId: me } });
    reply({ ok: true, relation: "none" });
  });

  on("bl_friends", async (_d, reply) => {
    const rows = await q(sql`select u.id, u.name, u.region, u.level, u.interests from bl_friendships f join users u on u.id = case when f.user_a = ${me}::uuid then f.user_b else f.user_a end where f.user_a = ${me}::uuid or f.user_b = ${me}::uuid order by lower(u.name) limit 200`);
    reply({ ok: true, friends: rows.map((r) => toBuddy(r, "friends")) });
  });

  on("bl_requests", async (_d, reply) => {
    const inc = await q(sql`select u.id, u.name, u.region, u.level, u.interests from bl_friend_requests r join users u on u.id = r.from_user_id where r.to_user_id = ${me}::uuid and r.status = 'pending' order by r.created_at desc limit 100`);
    const out = await q(sql`select u.id, u.name, u.region, u.level, u.interests from bl_friend_requests r join users u on u.id = r.to_user_id where r.from_user_id = ${me}::uuid and r.status = 'pending' order by r.created_at desc limit 100`);
    reply({ ok: true, incoming: inc.map((r) => toBuddy(r, "request_received")), outgoing: out.map((r) => toBuddy(r, "request_sent")) });
  });

  /* ───────── block / report ───────── */
  on("bl_block", async (d, reply) => {
    const id = idOf(d.userId);
    if (!id || id === me) return reply({ ok: false, error: "invalid" });
    const [x, y] = pair(me, id);
    await db.execute(sql`insert into bl_blocks (blocker_id, blocked_id) values (${me}::uuid, ${id}::uuid) on conflict do nothing`);
    await db.execute(sql`delete from bl_friendships where user_a = ${x}::uuid and user_b = ${y}::uuid`);
    await db.execute(sql`delete from bl_conversations where user_a = ${x}::uuid and user_b = ${y}::uuid`);
    await db.execute(sql`update bl_friend_requests set status = 'cancelled', responded_at = now() where status = 'pending' and ((from_user_id = ${me}::uuid and to_user_id = ${id}::uuid) or (from_user_id = ${id}::uuid and to_user_id = ${me}::uuid))`);
    friendCache.delete(fkey(me, id));
    log.info({ by: me, blocked: id }, "BuddyLive: user blocked");
    reply({ ok: true, relation: "none" });
  });

  on("bl_unblock", async (d, reply) => {
    const id = idOf(d.userId);
    if (!id) return reply({ ok: false, error: "invalid" });
    await db.execute(sql`delete from bl_blocks where blocker_id = ${me}::uuid and blocked_id = ${id}::uuid`);
    reply({ ok: true });
  });

  on("bl_blocked_list", async (_d, reply) => {
    const rows = await q(sql`select u.id, u.name, u.region, u.level, u.interests from bl_blocks b join users u on u.id = b.blocked_id where b.blocker_id = ${me}::uuid order by b.created_at desc limit 200`);
    reply({ ok: true, blocked: rows.map((r) => toBuddy(r, "none")) });
  });

  on("bl_report", async (d, reply) => {
    const id = idOf(d.userId);
    if (!id || id === me) return reply({ ok: false, error: "invalid" });
    if (!(await userRow(id))) return reply({ ok: false, error: "unavailable" });
    const today = await q(sql`select count(*)::int as n from bl_reports where reporter_id = ${me}::uuid and created_at > now() - interval '1 day'`);
    if (Number(today[0]?.n ?? 0) >= REPORTS_PER_DAY) return reply({ ok: false, error: "too_many" });
    const category = REPORT_CATEGORIES.has(String(d.category)) ? String(d.category) : "other";
    let description = String(d.description ?? "").slice(0, 500);
    // Chat messages are deleted after RETENTION_DAYS, so keep a short copy of the last messages with the report.
    const [x, y] = pair(me, id);
    const last = await q(sql`select m.sender_id, m.body from bl_chat_messages m join bl_conversations c on c.id = m.conversation_id where c.user_a = ${x}::uuid and c.user_b = ${y}::uuid order by m.created_at desc limit 10`);
    if (last.length > 0) {
      const lines = last.reverse().map((m) => `${String(m.sender_id) === me ? "reporter" : "reported"}: ${m.body}`).join("\n");
      description = `${description}\n--- last messages ---\n${lines}`.slice(0, 2000);
    }
    await db.execute(sql`insert into bl_reports (reporter_id, reported_user_id, category, description) values (${me}::uuid, ${id}::uuid, ${category}, ${description || null})`);
    log.warn({ reportedBy: me, reported: id, category }, "BuddyLive: user reported");
    reply({ ok: true });
  });

  /* ───────── chats ───────── */
  on("bl_badges", async (_d, reply) => {
    const u = await q(sql`select count(*)::int as n from bl_chat_messages m join bl_conversations c on c.id = m.conversation_id where m.sender_id <> ${me}::uuid and (c.user_a = ${me}::uuid or c.user_b = ${me}::uuid) and m.created_at > (case when c.user_a = ${me}::uuid then c.user_a_last_read_at else c.user_b_last_read_at end)`);
    const r = await q(sql`select count(*)::int as n from bl_friend_requests where to_user_id = ${me}::uuid and status = 'pending'`);
    reply({ ok: true, unread: Number(u[0]?.n ?? 0), requests: Number(r[0]?.n ?? 0) });
  });

  on("bl_conversations", async (_d, reply) => {
    const rows = await q(sql`
      select u.id, u.name, u.region, u.level, u.interests, lm.body, lm.sender_id, lm.created_at,
        (select count(*)::int from bl_chat_messages m where m.conversation_id = c.id and m.sender_id <> ${me}::uuid
          and m.created_at > (case when c.user_a = ${me}::uuid then c.user_a_last_read_at else c.user_b_last_read_at end)) as unread
      from bl_conversations c
      join users u on u.id = (case when c.user_a = ${me}::uuid then c.user_b else c.user_a end)
      join lateral (select body, sender_id, created_at from bl_chat_messages where conversation_id = c.id order by created_at desc limit 1) lm on true
      where (c.user_a = ${me}::uuid or c.user_b = ${me}::uuid)
        and not exists (select 1 from bl_blocks b where (b.blocker_id = ${me}::uuid and b.blocked_id = u.id) or (b.blocker_id = u.id and b.blocked_id = ${me}::uuid))
      order by lm.created_at desc
      limit 50`);
    const chats = rows.map((r) => ({
      ...toBuddy(r, "friends"),
      lastText: String(r.body),
      lastMine: String(r.sender_id) === me,
      lastAt: ms(r.created_at),
      unread: Number(r.unread ?? 0),
    }));
    reply({ ok: true, chats });
  });

  on("bl_history", async (d, reply) => {
    const other = idOf(d.userId);
    if (!other) return reply({ ok: false, error: "invalid" });
    const limit = Math.min(Math.max(Number(d.limit) || 30, 1), 50);
    const [x, y] = pair(me, other);
    const conv = await q(sql`select id from bl_conversations where user_a = ${x}::uuid and user_b = ${y}::uuid`);
    if (!conv[0]) return reply({ ok: true, messages: [], hasMore: false });
    const cid = String(conv[0].id);
    const beforeNum = Number(d.before);
    const rows =
      beforeNum > 0
        ? await q(sql`select id, client_id, body, sender_id, created_at, delivered_at from bl_chat_messages where conversation_id = ${cid}::uuid and created_at < ${new Date(beforeNum + 1).toISOString()}::timestamptz order by created_at desc limit ${limit + 1}`)
        : await q(sql`select id, client_id, body, sender_id, created_at, delivered_at from bl_chat_messages where conversation_id = ${cid}::uuid order by created_at desc limit ${limit + 1}`);
    const hasMore = rows.length > limit;
    const messages = rows
      .slice(0, limit)
      .reverse()
      .map((m) => ({
        id: String(m.id),
        clientId: m.client_id ?? null,
        text: String(m.body),
        mine: String(m.sender_id) === me,
        at: ms(m.created_at),
        delivered: String(m.sender_id) !== me || !!m.delivered_at,
      }));
    reply({ ok: true, messages, hasMore });
  });

  on("bl_send", async (d, reply) => {
    const to = idOf(d.toUserId);
    const text = typeof d.text === "string" ? d.text.trim() : "";
    const clientId = typeof d.clientId === "string" && d.clientId.length <= 80 ? d.clientId : null;
    if (!to || to === me) return reply({ ok: false, error: "invalid" });
    if (!text || text.length > MAX_LEN) return reply({ ok: false, error: "length" });
    if (notEnglish(text)) return reply({ ok: false, error: "english_only" });
    if (tooFast(`send:${me}`, SEND_WINDOW_MS, SEND_MAX)) return reply({ ok: false, error: "slow_down" });
    if (await isSuspended(me)) return reply({ ok: false, error: "suspended" });
    if (!(await userRow(to))) return reply({ ok: false, error: "unavailable" });
    if (await isBlockedPair(me, to)) return reply({ ok: false, error: "blocked" });
    if (!(await areFriends(me, to))) return reply({ ok: false, error: "not_friends" });

    const [x, y] = pair(me, to);
    const conv = await q(sql`insert into bl_conversations (user_a, user_b) values (${x}::uuid, ${y}::uuid) on conflict (user_a, user_b) do update set user_a = excluded.user_a returning id`);
    const cid = String(conv[0].id);

    let ins = await q(sql`insert into bl_chat_messages (conversation_id, sender_id, body, client_id) values (${cid}::uuid, ${me}::uuid, ${text}, ${clientId}) on conflict (sender_id, client_id) where client_id is not null do nothing returning id, created_at`);
    if (!ins[0] && clientId) {
      // Retry of a message that was already saved: answer with the saved one, do not send it twice.
      ins = await q(sql`select id, created_at, delivered_at from bl_chat_messages where sender_id = ${me}::uuid and client_id = ${clientId}`);
      if (ins[0]) return reply({ ok: true, id: String(ins[0].id), at: ms(ins[0].created_at), delivered: !!ins[0].delivered_at });
    }
    if (!ins[0]) return reply({ ok: false, error: "failed" });
    const id = String(ins[0].id);
    const at = ms(ins[0].created_at);

    await db.execute(sql`update bl_conversations set last_message_at = now(),
      user_a_last_read_at = (case when user_a = ${me}::uuid then now() else user_a_last_read_at end),
      user_b_last_read_at = (case when user_b = ${me}::uuid then now() else user_b_last_read_at end)
      where id = ${cid}::uuid`);

    const delivered = emitTo(to, "bl_message", { id, fromUserId: me, fromName: meta.name, text, at, clientId });
    if (delivered) await db.execute(sql`update bl_chat_messages set delivered_at = now() where id = ${id}::uuid`);
    reply({ ok: true, id, at, delivered });
  });

  on("bl_read", async (d, reply) => {
    const other = idOf(d.userId);
    if (!other) return reply({ ok: false, error: "invalid" });
    const [x, y] = pair(me, other);
    await db.execute(sql`update bl_conversations set
      user_a_last_read_at = (case when user_a = ${me}::uuid then now() else user_a_last_read_at end),
      user_b_last_read_at = (case when user_b = ${me}::uuid then now() else user_b_last_read_at end)
      where user_a = ${x}::uuid and user_b = ${y}::uuid`);
    const rows = await q(sql`update bl_chat_messages set delivered_at = now() where sender_id = ${other}::uuid and delivered_at is null and conversation_id = (select id from bl_conversations where user_a = ${x}::uuid and user_b = ${y}::uuid) returning id`);
    if (rows.length > 0) emitTo(other, "bl_delivered", { byUserId: me, ids: rows.map((r) => String(r.id)) });
    reply({ ok: true });
  });

  // The app asks for this when it comes to the foreground: deliver everything that arrived while it was away.
  on("bl_sync", async (_d, reply) => {
    const rows = await q(sql`select m.id, m.client_id, m.body, m.sender_id, m.created_at from bl_chat_messages m join bl_conversations c on c.id = m.conversation_id where m.delivered_at is null and m.sender_id <> ${me}::uuid and (c.user_a = ${me}::uuid or c.user_b = ${me}::uuid) order by m.created_at asc limit 200`);
    if (rows.length > 0) {
      const bySender = new Map<string, string[]>();
      for (const m of rows) {
        const from = String(m.sender_id);
        socket.emit("bl_message", { id: String(m.id), fromUserId: from, text: String(m.body), at: ms(m.created_at), clientId: m.client_id ?? null });
        bySender.set(from, [...(bySender.get(from) ?? []), String(m.id)]);
      }
      await db.execute(sql`update bl_chat_messages set delivered_at = now() where id in (${sql.join(rows.map((m) => sql`${String(m.id)}::uuid`), sql`, `)})`);
      for (const [from, ids] of bySender) emitTo(from, "bl_delivered", { byUserId: me, ids });
    }
    reply({ ok: true, count: rows.length });
  });

  socket.on("bl_typing", (data: { toUserId?: string; typing?: boolean }) => {
    const to = idOf(data?.toUserId);
    if (!to || to === me || !findUser(to)) return;
    void areFriends(me, to, true)
      .then((ok) => {
        if (ok) emitTo(to, "bl_typing", { fromUserId: me, typing: !!data.typing });
      })
      .catch(() => {});
  });

  // Foreground flag and push settings are kept only so the app never waits for a reply. Push is switched off.
  on("bl_fg", (_d, reply) => reply({ ok: true }));
  on("bl_push_get", (_d, reply) => reply({ ok: true, enabled: false }));
  on("bl_push_set", (_d, reply) => reply({ ok: true, enabled: false }));
}