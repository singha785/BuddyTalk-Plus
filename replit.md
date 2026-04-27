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

- **artifacts/speakup** (Expo / mobile) — SpeakUp, an English speaking practice app for South Asia. Frontend-only with AsyncStorage persistence (no backend). Stack: Expo Router, @expo/vector-icons, expo-haptics, expo-linear-gradient, Inter fonts. Color palette: indigo `#5B3DFF` primary, orange `#FF7A45` accent. Features: 4-step onboarding (name → goal → level), 5 tabs (Home/Learn/Mentors/Wallet/Profile), animated practice call screen with AI tips/feedback, lesson player, mentor profile + booking, daily tasks, become-a-mentor flow, coin economy (₹10=20 coins, 1min=2 coins, 10min mentor=30 coins), rewarded ads (5 coins, 10/day), ₹29/mo premium (40 daily mins). State key: `speakup.state.v1`.
