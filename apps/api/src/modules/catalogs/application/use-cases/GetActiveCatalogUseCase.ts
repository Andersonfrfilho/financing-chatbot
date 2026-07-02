import type { AppConfigRepository } from '@/modules/settings/infra/repositories/AppConfigRepository'
import { APP_CONFIG_ACTIVE_CATALOG_KEY } from '../../shared/Catalog.constant'

export type GetActiveCatalogResult = {
  catalogId: string | null
}

export class GetActiveCatalogUseCase {
  constructor(private readonly appConfigRepository: AppConfigRepository) {}

  async execute(): Promise<GetActiveCatalogResult> {
    const catalogId = await this.appConfigRepository.getConfig(APP_CONFIG_ACTIVE_CATALOG_KEY)
    return { catalogId }
  }
}
