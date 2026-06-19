# Owner: services/worker. Local Docker image for the TrackX worker service.
FROM node:24-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY services/worker ./services/worker

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @trackx/worker build

CMD ["pnpm", "--filter", "@trackx/worker", "dev"]
