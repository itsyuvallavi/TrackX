# Owner: services/api. Local Docker image for the TrackX API service.
FROM node:24-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY services/api ./services/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @trackx/api build

EXPOSE 4001

CMD ["pnpm", "--filter", "@trackx/api", "dev"]
