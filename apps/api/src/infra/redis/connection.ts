import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
})

export async function checkRedisConnection(): Promise<void> {
  await redis.connect()
  await redis.ping()
  console.log('[Redis] Connected')
}
