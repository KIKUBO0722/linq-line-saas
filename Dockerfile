FROM node:20-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Copy root config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package.json files for all packages
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/db/ packages/db/
COPY apps/api/ apps/api/

# Build
RUN pnpm --filter db build 2>/dev/null || true
RUN pnpm --filter api build

# Production stage
FROM node:20-slim AS production

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/

RUN pnpm install --frozen-lockfile --prod

COPY --from=base /app/apps/api/dist apps/api/dist
COPY --from=base /app/packages/db packages/db

WORKDIR /app/apps/api

ENV NODE_OPTIONS="--dns-result-order=ipv4first"

EXPOSE 3601

CMD ["node", "--dns-result-order=ipv4first", "dist/main.js"]
