import { boolean, check, index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { usersTable } from "./users";

// One push token per user (latest device) + the user's notification on/off switch.
export const pushTokensTable = pgTable("push_tokens", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token"),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Legacy queue: messages sent while the receiver's app was closed. Deleted once delivered.
export const blMessagesTable = pgTable("bl_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  toUserId: uuid("to_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  fromName: text("from_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ───────── BuddyLive v2: friends, blocks, reports, persistent chats ─────────
 * These tables are also created automatically (create table if not exists) by
 * api-server/src/socket/buddylive.ts on first use, so both ways give the same shape. */

export const blFriendRequestsTable = pgTable(
  "bl_friend_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUserId: uuid("from_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // pending | accepted | rejected | cancelled
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("bl_fr_pending_uniq").on(t.fromUserId, t.toUserId).where(sql`status = 'pending'`),
    index("bl_fr_to_idx").on(t.toUserId, t.status),
    index("bl_fr_from_idx").on(t.fromUserId, t.status),
    check("bl_fr_not_self", sql`${t.fromUserId} <> ${t.toUserId}`),
  ],
);

// One row per friendship. user_a is always the smaller id, so a pair can exist only once.
export const blFriendshipsTable = pgTable(
  "bl_friendships",
  {
    userA: uuid("user_a").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    userB: uuid("user_b").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userA, t.userB] }),
    index("bl_fs_b_idx").on(t.userB),
    check("bl_fs_order", sql`${t.userA} < ${t.userB}`),
  ],
);

export const blBlocksTable = pgTable(
  "bl_blocks",
  {
    blockerId: uuid("blocker_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index("bl_blocks_blocked_idx").on(t.blockedId)],
);

export const blReportsTable = pgTable(
  "bl_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    reportedUserId: uuid("reported_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    description: text("description"),
    status: text("status").notNull().default("pending"), // pending | reviewed | dismissed | actioned
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("bl_reports_reported_idx").on(t.reportedUserId), index("bl_reports_status_idx").on(t.status, t.createdAt)],
);

export const blConversationsTable = pgTable(
  "bl_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userA: uuid("user_a").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    userB: uuid("user_b").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    userALastReadAt: timestamp("user_a_last_read_at", { withTimezone: true }).notNull().defaultNow(),
    userBLastReadAt: timestamp("user_b_last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("bl_conv_pair_uniq").on(t.userA, t.userB),
    index("bl_conv_a_idx").on(t.userA, t.lastMessageAt),
    index("bl_conv_b_idx").on(t.userB, t.lastMessageAt),
    check("bl_conv_order", sql`${t.userA} < ${t.userB}`),
  ],
);

export const blChatMessagesTable = pgTable(
  "bl_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => blConversationsTable.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    clientId: text("client_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (t) => [
    index("bl_cm_conv_idx").on(t.conversationId, t.createdAt),
    uniqueIndex("bl_cm_client_uniq").on(t.senderId, t.clientId).where(sql`client_id is not null`),
  ],
);

// Moderation switch: a suspended user disappears from discovery and cannot send. Set by an admin, never automatic.
export const blSuspensionsTable = pgTable("bl_suspensions", {
  userId: uuid("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  until: timestamp("until", { withTimezone: true }),
});
