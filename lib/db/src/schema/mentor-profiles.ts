import {
  doublePrecision,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { usersTable } from "./users";

export const mentorProfilesTable = pgTable("mentor_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  initials: text("initials").notNull(),
  mentorLevel: text("mentor_level")
    .$type<"Helper" | "Mentor" | "Pro Mentor">()
    .notNull()
    .default("Helper"),
  rating: doublePrecision("rating").notNull().default(4.5),
  sessions: integer("sessions").notNull().default(0),
  bio: text("bio").notNull().default(""),
  pricePer10Min: integer("price_per_10_min").notNull().default(20),
  languages: text("languages").array().notNull().default([]),
  specialties: text("specialties").array().notNull().default([]),
  accentColor: text("accent_color").notNull().default("#5B3DFF"),
});
