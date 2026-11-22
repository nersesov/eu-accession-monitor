# syntax=docker/dockerfile:1.7
# Multi-stage: deps -> builder -> runner (Next.js standalone, непривілейований користувач)

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat && corepack enable
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Значення потрібні лише щоб конфігурація завантажилась під час збірки; до БД збірка не звертається.
ENV PAYLOAD_SECRET=build-time-placeholder \
    DATABASE_URI=postgres://build:build@127.0.0.1:5432/build
RUN pnpm build

FROM node:22-alpine AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# npm/yarn у робочому образі не потрібні: менша поверхня атаки і менше вразливих залежностей
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs \
    && mkdir -p /app/media && chown nextjs:nodejs /app/media \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/lib/node_modules/corepack /opt/yarn-*
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/healthz >/dev/null || exit 1
CMD ["node", "server.js"]
