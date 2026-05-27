---
name: Mentor seeding approach
description: How demo mentor accounts are seeded into the DB on startup
---

6 demo mentor accounts are seeded into `users` + `mentor_profiles` tables on server startup via `seedMentors()` in `artifacts/api-server/src/lib/seed.ts`.

**Guard:** Checks `COUNT(*) WHERE role='mentor'` before seeding; skips if already at `SEED_MENTORS.length`.

**Demo emails:** Use `@buddytalk.demo` suffix to distinguish from real users.

**mentor_profiles table:** Stores display-only fields (bio, rating, sessions, pricePer10Min, languages, specialties, accentColor, initials, mentorLevel). Joined with users table in GET /mentors.

**Why:** Keeps mentor display data in the DB (not hardcoded frontend) while allowing the app to show real mentors immediately without user registration flow.

**How to apply:** When adding more demo mentors, add to the SEED_MENTORS array in seed.ts; the guard will re-seed if count is less than array length.
