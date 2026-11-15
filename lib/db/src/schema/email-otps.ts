import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";

export const emailOtpsTable = pgTable(
  "email_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    code: text("code").notNull(),
    purpose: text("purpose").notNull().default("signup"),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_otps_email_idx").on(t.email)],
);

export type EmailOtp = typeof emailOtpsTable.$inferSelect;
