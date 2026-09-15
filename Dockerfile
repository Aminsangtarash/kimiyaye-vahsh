# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/game-core/package.json packages/game-core/
COPY packages/game-server/package.json packages/game-server/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS build
COPY . .
RUN pnpm --filter @kv/contracts build \
 && pnpm --filter @kv/game-core build \
 && pnpm --filter @kv/game-server build \
 && pnpm --filter @kv/web build

FROM node:22-bookworm-slim AS server
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/data ./data
RUN mkdir -p /app/.data/matches
EXPOSE 4010
CMD ["pnpm", "--filter", "@kv/game-server", "start"]

FROM nginx:1.27-alpine AS web
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY deploy/nginx-web.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
