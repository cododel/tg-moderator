# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.3.14
FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app
ENV CI=true

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY tsconfig.json tsconfig.build.json vitest.config.ts ./
COPY src ./src
COPY tests ./tests
RUN bun run test
RUN bun run typecheck
RUN bun run build

FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS runtime
ENV NODE_ENV=production
STOPSIGNAL SIGTERM
USER bun
COPY --from=prod-deps --chown=bun:bun /app/package.json ./package.json
COPY --from=prod-deps --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/dist ./dist
CMD ["bun", "run", "start:prod"]
