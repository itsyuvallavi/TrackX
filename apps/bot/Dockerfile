FROM node:24-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY apps/bot ./apps/bot

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @trackx/bot build

EXPOSE 4003

CMD ["pnpm", "--filter", "@trackx/bot", "dev"]
