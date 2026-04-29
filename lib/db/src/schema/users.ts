import { pgTable, text, timestamp, uuid, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name").notNull().default(""),
  role: text("role").notNull().default("learner"),
  level: text("level"),
  goal: text("goal"),
  region: text("region").notNull().default("South Asia"),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  onboarded: boolean("onboarded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const userRoleSchema = z.enum(["learner", "mentor", "admin"]);
export const userLevelSchema = z.enum(["Beginner", "Intermediate", "Advanced"]);
export const userGoalSchema = z.enum(["job", "study", "daily", "travel"]);
