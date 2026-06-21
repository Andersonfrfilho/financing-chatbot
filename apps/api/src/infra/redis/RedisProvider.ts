import type { CacheProvider } from '@/shared/providers/CacheProvider'
import { redis } from './connection'

export class RedisProvider implements CacheProvider {
  async get(key: string): Promise<string | null> {
    return redis.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await redis.set(key, value, 'EX', ttlSeconds)
    } else {
      await redis.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    await redis.del(key)
  }

  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key)
    return result === 1
  }
}
