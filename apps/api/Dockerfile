FROM oven/bun:1.1 AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --production

FROM oven/bun:1.1 AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY drizzle ./drizzle

EXPOSE 3333
CMD ["bun", "run", "src/index.ts"]
