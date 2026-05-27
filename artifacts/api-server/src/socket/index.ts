import type { IncomingMessage, Server as HttpServer } from "http";
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
  inCallWith: string | null; // socketId of partner
};

type QueueEntry = {
  socketId: string;
  userId: string;
  name: string;
  region: string;
  level: string | null;
  joinedAt: number;
};

// In-memory state
const connected = new Map<string, ConnectedUser>(); // socketId → ConnectedUser
const socketByUser = new Map<string, string>(); // userId → socketId
const queue: QueueEntry[] = [];

let io: SocketServer;

export function getIo(): SocketServer {
  return io;
}

export function getPresenceMap(): Map<string, PresenceStatus> {
  const map = new Map<string, PresenceStatus>();
  for (const [, u] of connected) {
    map.set(u.userId, u.status);
  }
  return map;
}

function broadcastPresence(userId: string, status: PresenceStatus) {
  io.emit("presence_update", { userId, status });
}

async function authenticateSocket(
  socket: Socket,
): Promise<UserMeta | null> {
  const raw = socket.handshake.auth["token"] as string | undefined;
  if (!raw) return null;
  try {
    const [session] = await db
      .select({
        userId: sessionsTable.userId,
        expiresAt: sessionsTable.expiresAt,
      })
      .from(sessionsTable)
      .where(eq(sessionsTable.token, raw))
      .limit(1);
    if (!session || session.expiresAt < new Date()) return null;
    const { usersTable } = await import("@workspace/db");
    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        region: usersTable.region,
        level: usersTable.level,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);
    if (!user) return null;
    return {
      userId: user.id,
      name: user.name ?? "Buddy",
      region: user.region ?? "South Asia",
      level: user.level,
      role: user.role,
    };
  } catch (err) {
    logger.error({ err }, "Socket auth error");
    return null;
  }
}

function tryMatch() {
  if (queue.length < 2) return;
  const a = queue.shift()!;
  const b = queue.shift()!;

  const socketA = io.sockets.sockets.get(a.socketId);
  const socketB = io.sockets.sockets.get(b.socketId);
  if (!socketA || !socketB) {
    // Put survivors back
    if (socketA) queue.unshift(a);
    if (socketB) queue.unshift(b);
    return;
  }

  // Mark in-call
  const uA = connected.get(a.socketId);
  const uB = connected.get(b.socketId);
  if (uA) { uA.status = "in-call"; uA.inCallWith = b.socketId; broadcastPresence(a.userId, "in-call"); }
  if (uB) { uB.status = "in-call"; uB.inCallWith = a.socketId; broadcastPresence(b.userId, "in-call"); }

  const AVATAR_COLORS = ["#FF7A45", "#5B3DFF", "#16A085", "#F5A524", "#E5484D", "#7C3AED"];
  const colorA = AVATAR_COLORS[Math.abs(a.userId.charCodeAt(0)) % AVATAR_COLORS.length];
  const colorB = AVATAR_COLORS[Math.abs(b.userId.charCodeAt(0)) % AVATAR_COLORS.length];

  socketA.emit("matched", {
    partnerId: b.userId,
    partnerSocketId: b.socketId,
    partnerName: b.name,
    partnerRegion: b.region,
    partnerLevel: b.level ?? "Beginner",
    partnerColor: colorB,
    isInitiator: true,
  });
  socketB.emit("matched", {
    partnerId: a.userId,
    partnerSocketId: a.socketId,
    partnerName: a.name,
    partnerRegion: a.region,
    partnerLevel: a.level ?? "Beginner",
    partnerColor: colorA,
    isInitiator: false,
  });

  io.emit("queue_size", queue.length);
  logger.info({ userA: a.userId, userB: b.userId }, "Practice partners matched");
}

export function initSocket(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    const meta = await authenticateSocket(socket);
    if (!meta) {
      next(new Error("Unauthorized"));
      return;
    }
    (socket as Socket & { userMeta: UserMeta }).userMeta = meta;
    next();
  });

  io.on("connection", (socket) => {
    const meta = (socket as Socket & { userMeta: UserMeta }).userMeta;

    // Register in connected map
    connected.set(socket.id, {
      ...meta,
      socketId: socket.id,
      status: "live",
      inCallWith: null,
    });
    // If user was already connected on another socket, disconnect the old one
    const oldSocketId = socketByUser.get(meta.userId);
    if (oldSocketId && oldSocketId !== socket.id) {
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      if (oldSocket) oldSocket.disconnect(true);
      connected.delete(oldSocketId);
    }
    socketByUser.set(meta.userId, socket.id);

    broadcastPresence(meta.userId, "live");
    socket.emit("queue_size", queue.length);

    // Send full presence snapshot so the new client can render everyone's status
    const presenceSnapshot: Record<string, PresenceStatus> = {};
    for (const [, u] of connected) {
      presenceSnapshot[u.userId] = u.status;
    }
    socket.emit("presence_snapshot", presenceSnapshot);

    logger.info({ userId: meta.userId, role: meta.role }, "Socket connected");

    // ── Heartbeat ─────────────────────────────────────────────────────────────
    socket.on("heartbeat", (data: { status?: PresenceStatus }) => {
      const u = connected.get(socket.id);
      if (!u) return;
      const newStatus: PresenceStatus =
        u.inCallWith ? "in-call" : (data.status ?? "live");
      if (u.status !== newStatus) {
        u.status = newStatus;
        broadcastPresence(u.userId, newStatus);
      }
    });

    // ── Queue ─────────────────────────────────────────────────────────────────
    socket.on("join_queue", () => {
      // Remove from queue if already there
      const idx = queue.findIndex((e) => e.socketId === socket.id);
      if (idx !== -1) queue.splice(idx, 1);

      queue.push({
        socketId: socket.id,
        userId: meta.userId,
        name: meta.name,
        region: meta.region,
        level: meta.level,
        joinedAt: Date.now(),
      });
      io.emit("queue_size", queue.length);
      logger.info({ userId: meta.userId, queueLength: queue.length }, "Joined queue");
      tryMatch();
    });

    socket.on("leave_queue", () => {
      const idx = queue.findIndex((e) => e.socketId === socket.id);
      if (idx !== -1) queue.splice(idx, 1);
      io.emit("queue_size", queue.length);
    });

    // ── WebRTC signaling ──────────────────────────────────────────────────────
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

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const u = connected.get(socket.id);
      if (u) {
        if (u.inCallWith) {
          io.to(u.inCallWith).emit("call_ended", { from: socket.id });
          const partner = connected.get(u.inCallWith);
          if (partner) {
            partner.status = "live";
            partner.inCallWith = null;
            broadcastPresence(partner.userId, "live");
          }
        }
        broadcastPresence(u.userId, "offline");
        connected.delete(socket.id);
        if (socketByUser.get(u.userId) === socket.id) {
          socketByUser.delete(u.userId);
        }
      }
      // Remove from queue
      const idx = queue.findIndex((e) => e.socketId === socket.id);
      if (idx !== -1) {
        queue.splice(idx, 1);
        io.emit("queue_size", queue.length);
      }
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  logger.info("Socket.IO initialized on path /api/socket.io");
}
