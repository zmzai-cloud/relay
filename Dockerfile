# Relay 自托管镜像（开源化批次 2）：
# 多阶段构建 → Next standalone（server.js + 精简依赖），运行镜像不含源码与构建工具。
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 RELAY_DOCKER_BUILD=1
# NEXT_PUBLIC_* 在此内联；通用镜像用默认值，部署档案（如 zmzai）经构建参数覆盖
ARG NEXT_PUBLIC_API_ORIGIN
ARG NEXT_PUBLIC_AUTH_URL
ARG BRAND_SITE_TITLE
ARG BRAND_TAGLINE
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S relay && adduser -S relay -G relay
# @node-rs/argon2 的 linux musl napi 预编译随 standalone 收集进 node_modules
COPY --from=build --chown=relay:relay /app/.next/standalone ./
COPY --from=build --chown=relay:relay /app/.next/static ./.next/static
USER relay
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=4s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
