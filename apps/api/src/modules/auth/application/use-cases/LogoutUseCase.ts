import type { CacheProvider } from '@/shared/providers/CacheProvider'

export class LogoutUseCase {
  constructor(private readonly cache: CacheProvider) {}

  async execute(userId: string): Promise<void> {
    await this.cache.del(`refresh:${userId}`)
  }
}
