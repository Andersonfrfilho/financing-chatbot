FROM oven/bun:1.1 AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --production

FROM oven/bun:1.1 AS builder
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install
COPY . .
RUN bun build ./src/index.ts --outdir ./dist --target node --external 'uWebSockets.js' --external '@node-rs/argon2'

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./package.json

EXPOSE 3333
CMD ["node", "dist/index.js"]
