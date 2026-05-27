import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { mentorProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getPresenceMap } from "../socket";

const router: IRouter = Router();

router.get("/mentors", async (req, res) => {
  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      region: usersTable.region,
      level: usersTable.level,
      initials: mentorProfilesTable.initials,
      mentorLevel: mentorProfilesTable.mentorLevel,
      rating: mentorProfilesTable.rating,
      sessions: mentorProfilesTable.sessions,
      bio: mentorProfilesTable.bio,
      pricePer10Min: mentorProfilesTable.pricePer10Min,
      languages: mentorProfilesTable.languages,
      specialties: mentorProfilesTable.specialties,
      accentColor: mentorProfilesTable.accentColor,
    })
    .from(usersTable)
    .innerJoin(mentorProfilesTable, eq(usersTable.id, mentorProfilesTable.userId))
    .where(eq(usersTable.role, "mentor"));

  const presence = getPresenceMap();

  const mentors = rows.map((m) => ({
    id: m.id,
    name: m.name ?? "",
    region: m.region ?? "South Asia",
    level: m.level ?? "Beginner",
    initials: m.initials,
    mentorLevel: m.mentorLevel,
    rating: m.rating,
    sessions: m.sessions,
    bio: m.bio,
    pricePer10Min: m.pricePer10Min,
    languages: m.languages,
    specialties: m.specialties,
    accentColor: m.accentColor,
    presenceStatus: presence.get(m.id) ?? null,
  }));

  res.json(mentors);
});

export default router;
