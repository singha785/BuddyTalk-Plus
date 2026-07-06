FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Copy all packages needed for the api-server build
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/

# Install all dependencies (including devDependencies for the build step)
RUN pnpm install --frozen-lockfile

# Build the api-server bundle
RUN cd artifacts/api-server && PORT=8080 pnpm run build

# ── Production image ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy the compiled bundle from the build stage
COPY --from=base /app/artifacts/api-server/dist ./artifacts/api-server/dist

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:8080/api/healthz || exit 1

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
