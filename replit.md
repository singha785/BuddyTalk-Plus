# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

- **artifacts/api-server** (Express) — Backend for BuddyTalk+. Drizzle + Postgres. Auth (signup/login/magic-link/me, scrypt-hashed passwords, 30-day bearer sessions, dev-only magic-link tokens returned in non-prod), `PATCH /users/me` for profile updates. Schema: `users`, `sessions`, `magic_links`, `presence`, `waiting_queue`, `voice_sessions`, `reports`, `blocked_users`, `mentor_applications`. OpenAPI is the contract — regenerate with `pnpm --filter @workspace/api-spec run codegen` (PascalCase Zod exports e.g. `SignupBody`).
- **artifacts/speakup** (Expo / mobile) — BuddyTalk+, an English speaking practice app for South Asia (formerly SpeakUp). Now backed by `api-server`. Auth lives in `context/AuthContext.tsx` with `(auth)` route group: `welcome`, `sign-in`, `sign-up`, `magic-link`. Token persisted in AsyncStorage key `buddytalk.auth.token.v1`; `lib/apiSetup.ts` calls `setBaseUrl`/`setAuthTokenGetter` once at module load (web uses relative `/api`, native uses `https://${EXPO_PUBLIC_DOMAIN}`). `_layout.tsx` `NavigationGate` redirects on auth + onboarding state. Onboarding (`completeOnboarding`) writes through to server via `PATCH /users/me`; AppContext mirrors auth user into `state.profile`. Profile screen has Sign-out row. Stack: Expo Router, @expo/vector-icons, expo-haptics, expo-linear-gradient, Inter fonts. Color palette: indigo `#5B3DFF` primary, orange `#FF7A45` accent. Features: 4-step onboarding (name → goal → level), 5 tabs (Home/Learn/Mentors/Wallet/Profile), animated practice call screen with AI tips/feedback + random partner selection, lesson player, mentor profile + booking, daily tasks, become-a-mentor flow, coin economy (₹10=20 coins, 1min=2 coins, 10min mentor=30 coins), rewarded ads (5 coins, 10/day), ₹29/mo premium (40 daily mins), Call History screen with AI feedback per call + report/block. **Live mentor presence**: `data/presence.ts` + `hooks/usePresenceTick.ts` simulate real-time mentor status (live/in-call/away/offline) deterministic per-5min-slot, updated every 30s; mentors tab sorted live-first with a "Live now" filter and live-count banner; call button on detail screen is disabled when mentor isn't live. State key: `speakup.state.v1` (preserved through rebrand).
