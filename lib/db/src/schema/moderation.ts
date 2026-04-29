import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";

import { usersTable } from "./users";

export const reportsTable = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    reportedUserId: uuid("reported_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id"),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reports_reported_user_idx").on(t.reportedUserId)],
);

export type Report = typeof reportsTable.$inferSelect;

export const blockedUsersTable = pgTable(
  "blocked_users",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("blocked_users_blocker_idx").on(t.blockerId)],
);

export type BlockedUser = typeof blockedUsersTable.$inferSelect;

export const mentorApplicationsTable = pgTable(
  "mentor_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    experience: text("experience").notNull(),
    languageLevel: text("language_level").notNull(),
    bio: text("bio"),
    idDocumentUrl: text("id_document_url"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("mentor_applications_user_idx").on(t.userId)],
);

export type MentorApplication = typeof mentorApplicationsTable.$inferSelect;
