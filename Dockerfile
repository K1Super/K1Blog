FROM node:22-bookworm-slim AS deps
WORKDIR /app

# 构建机到 Debian 官方源不稳定时可用局域网/国内镜像替换，避免拉包拖住整次构建
ARG DEBIAN_MIRROR=deb.debian.org

RUN sed -i "s|http://deb.debian.org|http://${DEBIAN_MIRROR}|g" /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@12.16.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app

COPY . .

ARG SITE_URL=http://localhost:3000
ARG BUILD_NODE_OPTIONS=
# 构建期收集路由会打开数据库，指向临时目录避免依赖运行期数据目录
ENV DATABASE_PATH=/tmp/k1blog-build.db
ENV APP_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=${BUILD_NODE_OPTIONS} \
    SITE_URL=${SITE_URL} \
    BETTER_AUTH_SECRET=build-only-secret-that-is-long-enough-32 \
    COMMENT_IP_PEPPER=build-only-pepper-long-enough \
    SMTP_URL= \
    SMTP_FROM= \
    ADMIN_EMAIL= \
    ADMIN_USERNAME= \
    ADMIN_PASSWORD=

RUN pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    APP_ENV=production \
    DATABASE_PATH=/app/data/k1blog.db

RUN groupadd --system --gid 1001 k1 \
  && useradd --system --uid 1001 --gid 1001 k1 \
  && mkdir -p /app/data \
  && chown -R k1:k1 /app

COPY --from=builder --chown=k1:k1 /app/.next/standalone ./
COPY --from=builder --chown=k1:k1 /app/scripts/entrypoint.mjs ./scripts/entrypoint.mjs
COPY --from=builder --chown=k1:k1 /app/dist/bootstrap-admin.mjs ./scripts/bootstrap-admin.mjs
COPY --from=builder --chown=k1:k1 /app/scripts/backup-db.mjs ./scripts/backup-db.mjs
COPY --from=builder --chown=k1:k1 /app/scripts/purge-comments.mjs ./scripts/purge-comments.mjs

USER k1
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/v1/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

ENTRYPOINT ["node", "scripts/entrypoint.mjs"]
