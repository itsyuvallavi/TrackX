# Owner: services/parser. Local Docker image for the TrackX parser service.
FROM node:24-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY services/parser ./services/parser

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @trackx/parser build

EXPOSE 4002

CMD ["pnpm", "--filter", "@trackx/parser", "dev"]
