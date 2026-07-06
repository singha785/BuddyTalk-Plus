import { db, usersTable } from "@workspace/db";
import { mentorProfilesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { logger } from "./logger";
import { hashPassword } from "./auth";

const SEED_MENTORS = [
  {
    email: "anjali.perera@buddytalk.demo",
    name: "Anjali Perera",
    region: "Colombo, Sri Lanka",
    level: "Advanced" as const,
    initials: "AP",
    mentorLevel: "Pro Mentor" as const,
    rating: 4.9,
    sessions: 1240,
    bio: "Patient mentor specialising in interview English and confidence building.",
    pricePer10Min: 30,
    languages: ["Sinhala", "Tamil", "English"],
    specialties: ["Interview", "Confidence", "Pronunciation"],
    accentColor: "#5B3DFF",
  },
  {
    email: "rohan.verma@buddytalk.demo",
    name: "Rohan Verma",
    region: "Bengaluru, India",
    level: "Advanced" as const,
    initials: "RV",
    mentorLevel: "Mentor" as const,
    rating: 4.8,
    sessions: 860,
    bio: "Software engineer who loves teaching workplace English and small talk.",
    pricePer10Min: 28,
    languages: ["Hindi", "Kannada", "English"],
    specialties: ["Workplace", "Small Talk", "Tech"],
    accentColor: "#FF7A45",
  },
  {
    email: "priya.sharma@buddytalk.demo",
    name: "Priya Sharma",
    region: "Delhi, India",
    level: "Advanced" as const,
    initials: "PS",
    mentorLevel: "Pro Mentor" as const,
    rating: 5.0,
    sessions: 1840,
    bio: "Friendly mentor for beginners. We start from zero and build slowly.",
    pricePer10Min: 30,
    languages: ["Hindi", "Punjabi", "English"],
    specialties: ["Beginner", "Grammar", "Daily Life"],
    accentColor: "#16A085",
  },
  {
    email: "tariq.hussain@buddytalk.demo",
    name: "Tariq Hussain",
    region: "Dhaka, Bangladesh",
    level: "Advanced" as const,
    initials: "TH",
    mentorLevel: "Mentor" as const,
    rating: 4.7,
    sessions: 540,
    bio: "Helps you sound natural in everyday conversations.",
    pricePer10Min: 26,
    languages: ["Bangla", "Hindi", "English"],
    specialties: ["Fluency", "Accent", "Travel"],
    accentColor: "#F5A524",
  },
  {
    email: "meena.acharya@buddytalk.demo",
    name: "Meena Acharya",
    region: "Kathmandu, Nepal",
    level: "Intermediate" as const,
    initials: "MA",
    mentorLevel: "Helper" as const,
    rating: 4.6,
    sessions: 220,
    bio: "Chatty helper for relaxed practice sessions and student English.",
    pricePer10Min: 22,
    languages: ["Nepali", "Hindi", "English"],
    specialties: ["Student", "Casual", "Listening"],
    accentColor: "#E5484D",
  },
  {
    email: "zarah.ahmadi@buddytalk.demo",
    name: "Zarah Ahmadi",
    region: "Tehran, Iran",
    level: "Advanced" as const,
    initials: "ZA",
    mentorLevel: "Mentor" as const,
    rating: 4.8,
    sessions: 410,
    bio: "Focused on professional English for international remote work.",
    pricePer10Min: 28,
    languages: ["Persian", "English"],
    specialties: ["Professional", "Email English", "Calls"],
    accentColor: "#7C3AED",
  },
];

export async function seedMentors(): Promise<void> {
  try {
    const [{ value: existing }] = await db
      .select({ value: count() })
      .from(usersTable)
      .where(eq(usersTable.role, "mentor"));

    if (Number(existing) >= SEED_MENTORS.length) {
      return; // already seeded
    }

    const demoPassword = await hashPassword("DemoMentor2024!");

    for (const mentor of SEED_MENTORS) {
      const [existing] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, mentor.email))
        .limit(1);

      let userId: string;

      if (existing) {
        userId = existing.id;
      } else {
        const [newUser] = await db
          .insert(usersTable)
          .values({
            email: mentor.email,
            passwordHash: demoPassword,
            name: mentor.name,
            role: "mentor",
            level: mentor.level,
            region: mentor.region,
            onboarded: true,
            emailVerified: true,
          })
          .returning({ id: usersTable.id });
        userId = newUser.id;
      }

      // Upsert profile
      await db
        .insert(mentorProfilesTable)
        .values({
          userId,
          initials: mentor.initials,
          mentorLevel: mentor.mentorLevel,
          rating: mentor.rating,
          sessions: mentor.sessions,
          bio: mentor.bio,
          pricePer10Min: mentor.pricePer10Min,
          languages: mentor.languages,
          specialties: mentor.specialties,
          accentColor: mentor.accentColor,
        })
        .onConflictDoUpdate({
          target: mentorProfilesTable.userId,
          set: {
            rating: mentor.rating,
            sessions: mentor.sessions,
          },
        });
    }

    logger.info({ count: SEED_MENTORS.length }, "Mentor seed complete");
  } catch (err) {
    logger.error({ err }, "Mentor seed failed");
  }
}
