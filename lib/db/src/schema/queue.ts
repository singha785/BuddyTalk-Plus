import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";

import { usersTable } from "./users";

export const waitingQueueTable = pgTable(
  "waiting_queue",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    level: text("level"),
    preferMentor: text("prefer_mentor").notNull().default("any"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("waiting_queue_joined_at_idx").on(t.joinedAt)],
);

export type WaitingQueue = typeof waitingQueueTable.$inferSelect;

export const voiceSessionsTable = pgTable(
  "voice_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomName: text("room_name").notNull().unique(),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: text("duration_seconds"),
  },
  (t) => [index("voice_sessions_user_a_idx").on(t.userAId)],
);

export type VoiceSession = typeof voiceSessionsTable.$inferSelect;
