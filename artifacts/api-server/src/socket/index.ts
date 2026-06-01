import type { Server as HttpServer } from "http";
import { Server as SocketServer, type Socket } from "socket.io";
import { db } from "@workspace/db";
import { sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

export type PresenceStatus = "live" | "in-call" | "away" | "offline";

type UserMeta = {
  userId: string;
  name: string;
  region: string;
  level: string | null;
  role: string;
};

type ConnectedUser = UserMeta & {
  socketId: string;
  status: PresenceStatus;
  inCallWith: string | null;
  wantsCalls: boolean;
};

type QueueEntry = {
  socketId: string;
  userId: string;
  name: string;
  region: string;
  level: string | null;
  joinedAt: number;
};

type CallAttempt = {
  callId: string;
  callerSocketId: string;
  receiverSocketId: string;
  triedSocketIds: Set<string>;
};

const connected = new Map<string, ConnectedUser>();
const socketByUser = new Map<string, string>();
const queue: QueueEntry[] = [];
const activeCallAttempts = new Map<string, CallAttempt>();

let io: SocketServer;

const AVATAR_COLORS = ["#FF7A45", "#5B3DFF", "#16A085", "#F5A524", "#E5484D", "#7C3AED"];

function pickColor(userId: string): string {
  return AVATAR_COLORS[Math.abs(userId.charCodeAt(0)) % AVATAR_COLORS.length];
}

export function getIo(): SocketServer {
  return io;
}

export function getPresenceMap(): Map<string, PresenceStatus> {
  const map = new Map<string, PresenceStatus>();
  for (const [, u] of connected) map.set(u.userId, u.status);
  return map;
}

function broadcastPresence(userId: string, status: PresenceStatus) {
  io.emit("presence_update", { userId, status });
}

async function authenticateSocket(socket: Socket): Promise<UserMeta | null> {
  const raw = socket.handshake.auth["token"] as string | undefined;
  if (!raw) return null;
  try {
    const [session] = await db
      .select({ userId: sessionsTable.userId, expiresAt: sessionsTable.expiresAt })
      .from(sessionsTable)
      .where(eq(sessionsTable.token, raw))
      .limit(1);
    if (!session || session.expiresAt < new Date()) return null;
    const { usersTable } = await import("@workspace/db");
    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, region: usersTable.region, level: usersTable.level, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);
    if (!user) return null;
    return { userId: user.id, name: user.name ?? "Buddy", region: user.region ?? "South Asia", level: user.level, role: user.role };
  } catch (err) {
    logger.error({ err }, "Socket auth error");
    return null;
  }
}

// ── Legacy queue matching ──────────────────────────────────────────────────────
function tryMatch() {
  if (queue.length < 2) return;
  const a = queue.shift()!;
  const b = queue.shift()!;
  const socketA = io.sockets.sockets.get(a.socketId);
  const socketB = io.sockets.sockets.get(b.socketId);
  if (!socketA || !socketB) {
    if (socketA) queue.unshift(a);
    if (socketB) queue.unshift(b);
    return;
  }
  const uA = connected.get(a.socketId);
  const uB = connected.get(b.socketId);
  if (uA) { uA.status = "in-call"; uA.inCallWith = b.socketId; broadcastPresence(a.userId, "in-call"); }
  if (uB) { uB.status = "in-call"; uB.inCallWith = a.socketId; broadcastPresence(b.userId, "in-call"); }
  socketA.emit("matched", {
    partnerId: b.userId, partnerSocketId: b.socketId, partnerName: b.name,
    partnerRegion: b.region, partnerLevel: b.level ?? "Beginner", partnerColor: pickColor(b.userId), isInitiator: true,
  });
  socketB.emit("matched", {
    partnerId: a.userId, partnerSocketId: a.socketId, partnerName: a.name,
    partnerRegion: a.region, partnerLevel: a.level ?? "Beginner", partnerColor: pickColor(a.userId), isInitiator: false,
  });
  io.emit("queue_size", queue.length);
  logger.info({ userA: a.userId, userB: b.userId }, "Legacy queue: partners matched");
}

// ── Push-based calling helpers ────────────────────────────────────────────────
function findAvailableReceiver(callerSocketId: string, excluded: Set<string>): ConnectedUser | null {
  const candidates = Array.from(connected.values()).filter(
    (u) => u.socketId !== callerSocketId && u.status === "live" && u.wantsCalls && !u.inCallWith && !excluded.has(u.socketId),
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function ringNextUser(callId: string): void {
  const attempt = activeCallAttempts.get(callId);
  if (!attempt) return;
  const receiver = findAvailableReceiver(attempt.callerSocketId, attempt.triedSocketIds);
  if (!receiver) {
    io.to(attempt.callerSocketId).emit("no_users_available");
    activeCallAttempts.delete(callId);
    return;
  }
  attempt.receiverSocketId = receiver.socketId;
  attempt.triedSocketIds.add(receiver.socketId);
  const caller = connected.get(attempt.callerSocketId);
  if (!caller) { activeCallAttempts.delete(callId); return; }
  io.to(receiver.socketId).emit("incoming_call", {
    callId,
    callerId: caller.userId,
    callerSocketId: attempt.callerSocketId,
    callerName: caller.name,
    callerRegion: caller.region,
    callerLevel: caller.level ?? "Beginner",
    callerColor: pickColor(caller.userId),
  });
}

export function initSocket(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    const meta = await authenticateSocket(socket);
    if (!meta) { next(new Error("Unauthorized")); return; }
    (socket as Socket & { userMeta: UserMeta }).userMeta = meta;
    next();
  });

  io.on("connection", (socket) => {
    const meta = (socket as Socket & { userMeta: UserMeta }).userMeta;

    connected.set(socket.id, { ...meta, socketId: socket.id, status: "live", inCallWith: null, wantsCalls: true });

    const oldSocketId = socketByUser.get(meta.userId);
    if (oldSocketId && oldSocketId !== socket.id) {
      const old = io.sockets.sockets.get(oldSocketId);
      if (old) old.disconnect(true);
      connected.delete(oldSocketId);
    }
    socketByUser.set(meta.userId, socket.id);
    broadcastPresence(meta.userId, "live");
    socket.emit("queue_size", queue.length);

    const presenceSnapshot: Record<string, PresenceStatus> = {};
    for (const [, u] of connected) presenceSnapshot[u.userId] = u.status;
    socket.emit("presence_snapshot", presenceSnapshot);

    logger.info({ userId: meta.userId, role: meta.role }, "Socket connected");

    // ── Online / offline toggle ──────────────────────────────────────────────
    socket.on("set_online_status", (data: { online: boolean }) => {
      const u = connected.get(socket.id);
      if (!u || u.inCallWith) return;
      u.wantsCalls = data.online;
      const newStatus: PresenceStatus = data.online ? "live" : "away";
      if (u.status !== newStatus) { u.status = newStatus; broadcastPresence(u.userId, newStatus); }
    });

    // ── Heartbeat ────────────────────────────────────────────────────────────
    socket.on("heartbeat", (data: { status?: PresenceStatus }) => {
      const u = connected.get(socket.id);
      if (!u) return;
      const newStatus: PresenceStatus = u.inCallWith ? "in-call" : u.wantsCalls ? (data.status ?? "live") : "away";
      if (u.status !== newStatus) { u.status = newStatus; broadcastPresence(u.userId, newStatus); }
    });

    // ── Legacy queue ─────────────────────────────────────────────────────────
    socket.on("join_queue", () => {
      const idx = queue.findIndex((e) => e.socketId === socket.id);
      if (idx !== -1) queue.splice(idx, 1);
      queue.push({ socketId: socket.id, userId: meta.userId, name: meta.name, region: meta.region, level: meta.level, joinedAt: Date.now() });
      io.emit("queue_size", queue.length);
      tryMatch();
    });
    socket.on("leave_queue", () => {
      const idx = queue.findIndex((e) => e.socketId === socket.id);
      if (idx !== -1) { queue.splice(idx, 1); io.emit("queue_size", queue.length); }
    });

    // ── Push-based calling ────────────────────────────────────────────────────
    socket.on("call_user", () => {
      const caller = connected.get(socket.id);
      if (!caller || caller.inCallWith) return;

      const callId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const triedSocketIds = new Set<string>();
      const receiver = findAvailableReceiver(socket.id, triedSocketIds);

      if (!receiver) {
        socket.emit("no_users_available");
        return;
      }

      triedSocketIds.add(receiver.socketId);
      activeCallAttempts.set(callId, { callId, callerSocketId: socket.id, receiverSocketId: receiver.socketId, triedSocketIds });

      io.to(receiver.socketId).emit("incoming_call", {
        callId,
        callerId: caller.userId,
        callerSocketId: socket.id,
        callerName: caller.name,
        callerRegion: caller.region,
        callerLevel: caller.level ?? "Beginner",
        callerColor: pickColor(caller.userId),
      });
      socket.emit("call_ringing", { callId });
      logger.info({ callerId: meta.userId, receiverId: receiver.userId }, "Outgoing call — ringing");
    });

    socket.on("cancel_call", (data: { callId?: string }) => {
      for (const [cid, attempt] of activeCallAttempts) {
        if (attempt.callerSocketId !== socket.id) continue;
        if (data.callId && cid !== data.callId) continue;
        io.to(attempt.receiverSocketId).emit("call_cancelled");
        activeCallAttempts.delete(cid);
      }
    });

    socket.on("call_accept", (data: { callId: string }) => {
      const attempt = activeCallAttempts.get(data.callId);
      if (!attempt || attempt.receiverSocketId !== socket.id) return;

      const callerSocket = io.sockets.sockets.get(attempt.callerSocketId);
      if (!callerSocket) {
        socket.emit("call_cancelled");
        activeCallAttempts.delete(data.callId);
        return;
      }

      activeCallAttempts.delete(data.callId);

      const caller = connected.get(attempt.callerSocketId);
      const receiver = connected.get(socket.id);
      if (!caller || !receiver) return;

      caller.status = "in-call"; caller.inCallWith = socket.id;
      receiver.status = "in-call"; receiver.inCallWith = attempt.callerSocketId;
      broadcastPresence(caller.userId, "in-call");
      broadcastPresence(receiver.userId, "in-call");

      callerSocket.emit("call_matched", {
        partnerId: receiver.userId, partnerSocketId: socket.id, partnerName: receiver.name,
        partnerRegion: receiver.region, partnerLevel: receiver.level ?? "Beginner",
        partnerColor: pickColor(receiver.userId), isInitiator: true,
      });
      socket.emit("call_matched", {
        partnerId: caller.userId, partnerSocketId: attempt.callerSocketId, partnerName: caller.name,
        partnerRegion: caller.region, partnerLevel: caller.level ?? "Beginner",
        partnerColor: pickColor(caller.userId), isInitiator: false,
      });
      logger.info({ callerId: caller.userId, receiverId: receiver.userId }, "Call accepted — matched");
    });

    socket.on("call_reject", (data: { callId: string }) => {
      const attempt = activeCallAttempts.get(data.callId);
      if (!attempt || attempt.receiverSocketId !== socket.id) return;
      attempt.triedSocketIds.add(socket.id);
      ringNextUser(data.callId);
    });

    // ── WebRTC signaling ─────────────────────────────────────────────────────
    socket.on("offer", (data: { to: string; sdp: unknown }) => {
      io.to(data.to).emit("offer", { from: socket.id, sdp: data.sdp });
    });
    socket.on("answer", (data: { to: string; sdp: unknown }) => {
      io.to(data.to).emit("answer", { from: socket.id, sdp: data.sdp });
    });
    socket.on("ice_candidate", (data: { to: string; candidate: unknown }) => {
      io.to(data.to).emit("ice_candidate", { from: socket.id, candidate: data.candidate });
    });
    socket.on("call_ended", (data: { to: string }) => {
      io.to(data.to).emit("call_ended", { from: socket.id });
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const u = connected.get(socket.id);
      if (u) {
        if (u.inCallWith) {
          io.to(u.inCallWith).emit("call_ended", { from: socket.id });
          const partner = connected.get(u.inCallWith);
          if (partner) { partner.status = "live"; partner.inCallWith = null; broadcastPresence(partner.userId, "live"); }
        }
        broadcastPresence(u.userId, "offline");
        connected.delete(socket.id);
        if (socketByUser.get(u.userId) === socket.id) socketByUser.delete(u.userId);
      }
      // Cancel any outgoing call attempts
      for (const [cid, attempt] of activeCallAttempts) {
        if (attempt.callerSocketId === socket.id) {
          io.to(attempt.receiverSocketId).emit("call_cancelled");
          activeCallAttempts.delete(cid);
        } else if (attempt.receiverSocketId === socket.id) {
          attempt.triedSocketIds.add(socket.id);
          ringNextUser(cid);
        }
      }
      const idx = queue.findIndex((e) => e.socketId === socket.id);
      if (idx !== -1) { queue.splice(idx, 1); io.emit("queue_size", queue.length); }
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  logger.info("Socket.IO initialized on path /api/socket.io");
}
