# ==========================================
# Stage 1: Build Workspace with Node.js & pnpm
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Enable Corepack and pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy Workspace Definitions & Manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY workers/ ./workers/

# Install Monorepo Dependencies
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN pnpm install --frozen-lockfile

# Build Entire Workspace (Packages + Web App)
RUN pnpm run build

# ==========================================
# Stage 2: Production Web Runner
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/apps/web/server.mjs ./apps/web/server.mjs
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

EXPOSE 80

ENV PORT=80
ENV NODE_ENV=production

CMD ["node", "apps/web/server.mjs"]
