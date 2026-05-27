---
name: socket.io-client pnpm install in Expo app
description: How to properly install socket.io-client for the speakup Expo artifact
---

socket.io-client may appear as a broken symlink in `artifacts/speakup/node_modules/` with no actual package in the pnpm virtual store (`.pnpm/` dir won't show `socket.io-client@*` entry).

**Symptom:** TypeScript reports "Cannot find module 'socket.io-client'" even though the symlink exists in node_modules.

**Fix:** Run `pnpm --filter @workspace/speakup add socket.io-client@4` explicitly. This populates the pnpm virtual store and fixes the broken symlink.

**Why:** When two packages (api-server adds socket.io, speakup adds socket.io-client) are installed in the same `pnpm add` command run in parallel, pnpm sometimes skips deduplicating the client entry in the virtual store.

**How to apply:** If socket.io-client types fail to resolve in the Expo app, reinstall with the explicit filter.
