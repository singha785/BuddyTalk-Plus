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
- **Real-time**: Socket.IO (server) + socket.io-client (mobile)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

- **artifacts/api-server** (Express) — Backend for BuddyTalk+. Drizzle + Postgres. Auth (signup/login/magic-link/me, scrypt-hashed passwords, 30-day bearer sessions, dev-only magic-link tokens returned in non-prod), `PATCH /users/me` for profile updates. **Socket.IO** at path `/api/socket.io` (HTTP server wraps Express app) with auth middleware (Bearer token), real-time presence map, matching queue (`join_queue` → `matched` event), WebRTC signaling (offer/answer/ice_candidate/call_ended forwarding). **`GET /mentors`** returns 6 seeded mentor users joined with `mentor_profiles` table + live socket presence. `seedMentors()` runs on startup and inserts demo mentors if not already present. Schema: `users`, `sessions`, `magic_links`, `presence`, `waiting_queue`, `voice_sessions`, `reports`, `blocked_users`, `mentor_applications`, `mentor_profiles`. OpenAPI is the contract — regenerate with `pnpm --filter @workspace/api-spec run codegen` (PascalCase Zod exports e.g. `SignupBody`, `MentorProfile`).
- **artifacts/speakup** (Expo / mobile) — BuddyTalk+, an English speaking practice app for South Asia. Backed by `api-server`. Auth lives in `context/AuthContext.tsx` with `(auth)` route group: `welcome`, `sign-in`, `sign-up`, `magic-link`. Token persisted in AsyncStorage key `buddytalk.auth.token.v1`; `lib/apiSetup.ts` calls `setBaseUrl`/`setAuthTokenGetter` once at module load (web uses relative `/api`, native uses `https://${EXPO_PUBLIC_DOMAIN}`). `_layout.tsx` `NavigationGate` redirects on auth + onboarding state. **`context/SocketContext.tsx`** wraps the whole app (inside `AuthProvider`, wraps `AppProvider`): connects to `GET /api/socket.io` with Bearer token on login, emits heartbeat every 30s, exposes `presenceMap` (real-time mentor statuses), `joinQueue`/`leaveQueue`, WebRTC signaling helpers, and event-listener registration functions. **`hooks/useWebRTC.ts`** manages RTCPeerConnection on web (mic → getUserMedia → offer/answer/ICE via socket); degrades gracefully on native Expo Go. **`app/practice.tsx`** joins real socket queue on mount, waits for `matched` event (30s timeout), starts WebRTC call (web only). **`app/(tabs)/mentors.tsx`** fetches real mentor list from `GET /api/mentors`, overlays live socket presence; falls back to deterministic simulation for offline mentors. **`app/mentor/[id].tsx`** uses same real data + live presence from socket. Stack: Expo Router, @expo/vector-icons, expo-haptics, expo-linear-gradient, Inter fonts, socket.io-client. Color palette: indigo `#5B3DFF` primary, orange `#FF7A45` accent. Features: 4-step onboarding (name → goal → level), 5 tabs (Home/Learn/Mentors/Wallet/Profile), coin economy (₹10=20 coins, 1min=2 coins, 10min mentor=30 coins), rewarded ads (5 coins, 10/day), ₹29/mo premium (40 daily mins), Call History screen with AI feedback per call + report/block. State key: `speakup.state.v1`.
