import { pgTable, text, timestamp, uuid, boolean, index } from "drizzle-orm/pg-core";

import { usersTable } from "./users";

export const sessionsTable = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export type Session = typeof sessionsTable.$inferSelect;

export const magicLinksTable = pgTable(
  "magic_links",
  {
    token: text("token").primaryKey(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [index("magic_links_email_idx").on(t.email)],
);

export type MagicLink = typeof magicLinksTable.$inferSelect;

void boolean;
