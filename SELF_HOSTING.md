# BuddyTalk+ — Self-Hosting Guide

This guide explains how to run BuddyTalk+ entirely outside of Replit, on your own machine or any standard cloud provider. No Replit subscription is required.

---

## Architecture

```
artifacts/
  api-server/   — Express 5 + Socket.IO backend (Node 20)
  speakup/      — Expo (React Native + web) mobile app
lib/
  db/           — Drizzle ORM schema + PostgreSQL client
```

The API server is a plain Node.js process. The mobile app is a standard Expo project. All communication goes through standard HTTP and WebSocket — there are no Replit-specific protocols.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20 or later |
| pnpm | 9 or later (`npm i -g pnpm`) |
| PostgreSQL | 14+ (local, Supabase, Neon, or any provider) |

---

## 1 — Clone and Install

```bash
git clone <your-repo-url>
cd <repo-directory>
pnpm install
```

---

## 2 — PostgreSQL Setup

Choose **one** of the options below. All options produce a `DATABASE_URL` connection string.

### Option A — Local PostgreSQL with Docker (fastest for local dev)

```bash
docker compose up -d        # starts postgres on localhost:5432
```

`DATABASE_URL` for this option:
```
postgresql://buddytalk:buddytalk@localhost:5432/buddytalk
```

### Option B — Supabase free tier (recommended for production)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection string → URI**
3. Copy the connection string — it looks like:
   ```
   postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

### Option C — Neon free tier

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy the connection string from the dashboard:
   ```
   postgresql://<user>:<password>@<host>.neon.tech/neondb?sslmode=require
   ```

---

## 3 — API Server Setup

### Environment variables

Copy the example file and edit it:

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

Edit `artifacts/api-server/.env`:

```env
PORT=8080
NODE_ENV=development
DATABASE_URL=postgresql://buddytalk:buddytalk@localhost:5432/buddytalk
```

### Push the database schema

Run this once whenever the schema changes:

```bash
DATABASE_URL=<your-connection-string> pnpm --filter @workspace/db run push
```

Or if you created a `.env` file in the repo root with `DATABASE_URL` set, you can load it first:

```bash
export $(cat artifacts/api-server/.env | grep -v '#' | xargs)
pnpm --filter @workspace/db run push
```

### Run the API server in development

```bash
PORT=8080 DATABASE_URL=<your-connection-string> pnpm --filter @workspace/api-server run dev
```

The server starts at `http://localhost:8080`. Health check: `http://localhost:8080/api/healthz`

---

## 4 — Mobile / Web App Setup

### Run in the browser (web)

```bash
EXPO_PUBLIC_DOMAIN=localhost:8080 pnpm --filter @workspace/speakup run dev:web
```

Open `http://localhost:8081` in your browser.

### Run with Expo Go on your phone (LAN)

```bash
pnpm --filter @workspace/speakup run dev:local
```

- Scan the QR code in the terminal with the **Expo Go** app (iOS or Android).
- Set `EXPO_PUBLIC_DOMAIN` to your machine's local IP (e.g. `192.168.1.42:8080`) so the native app can reach your API server.

---

## 5 — Production Deployment

### API Server → Render (free tier) — one-click via Blueprint

A `render.yaml` is included at the repo root for one-click deployment:

1. Push your repo to GitHub.
2. Go to [render.com](https://render.com) → **New → Blueprint**.
3. Connect your GitHub repo — Render detects `render.yaml` automatically.
4. Render creates:
   - A **Web Service** (`buddytalk-api`) built from the `Dockerfile` at the repo root
   - A **PostgreSQL database** (`buddytalk-db`) on the free tier, wired up automatically
5. After the first deploy succeeds, copy the public URL (e.g. `buddytalk-api.onrender.com`).
6. Run the DB migration once from your local machine:
   ```bash
   DATABASE_URL="<render-postgres-url>" pnpm --filter @workspace/db run push
   ```
7. Set `ALLOWED_ORIGINS` in Render's environment to your app domain (leave blank for APK-only).

**Manual setup (no Blueprint):**

   | Field | Value |
   |-------|-------|
   | **Runtime** | Docker |
   | **Dockerfile Path** | `./Dockerfile` |
   | **Docker Context** | `.` (repo root) |

   Environment variables:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Your Supabase/Neon/Render Postgres connection string |
   | `NODE_ENV` | `production` |
   | `PORT` | `8080` |
   | `ALLOWED_ORIGINS` | `https://your-app-domain.com` |

8. After first deploy, note your Render service URL (e.g. `buddytalk-api.onrender.com`).

### API Server → Railway (free trial)

1. Create a project at [railway.app](https://railway.app).
2. Add a **GitHub** service, connect your repo.
3. Set build command: `pnpm install && pnpm --filter @workspace/api-server run build`
4. Set start command: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
5. Add the same environment variables as above.

### API Server → Docker (any VPS / self-hosted)

A `Dockerfile` is included at the repo root.

```bash
# Build from repo root
docker build -t buddytalk-api .

# Run
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e DATABASE_URL="postgresql://..." \
  -e NODE_ENV=production \
  -e ALLOWED_ORIGINS="https://your-app.com" \
  buddytalk-api
```

### Mobile App → EAS Build (Android APK / iOS IPA)

1. Install the EAS CLI: `npm i -g eas-cli`
2. Log in: `eas login`
3. In `artifacts/speakup/eas.json`, set `EXPO_PUBLIC_DOMAIN` to your deployed API server domain (without `https://`):

   ```json
   "production": {
     "env": {
       "EXPO_PUBLIC_DOMAIN": "your-api.onrender.com"
     }
   }
   ```

4. Build:

   ```bash
   cd artifacts/speakup
   eas build --platform android --profile production
   ```

---

## Environment Variable Reference

### API Server (`artifacts/api-server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Port the HTTP server listens on |
| `NODE_ENV` | Yes | `development` or `production` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ALLOWED_ORIGINS` | Prod only | Comma-separated list of allowed CORS origins |

### Expo App (`artifacts/speakup`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_DOMAIN` | Native only | API server domain, e.g. `your-api.onrender.com` (no `https://`, no trailing slash). Baked into the APK at EAS build time. Not needed for web (uses relative `/api`). |

---

## No Replit-Specific Packages

All npm dependencies are standard open-source packages. There are no `@replit/*` packages in `package.json`. The codebase runs identically inside and outside of Replit.

The `.replit-artifact/artifact.toml` files configure the Replit preview proxy — they are safe to ignore when running outside Replit.
