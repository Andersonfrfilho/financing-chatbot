import type { AppConfigRepository } from '@/modules/settings/infra/repositories/AppConfigRepository'
import { APP_CONFIG_ACTIVE_CATALOG_KEY } from '../../shared/Catalog.constant'

export type SetActiveCatalogInput = {
  catalogId: string
}

export class SetActiveCatalogUseCase {
  constructor(private readonly appConfigRepository: AppConfigRepository) {}

  async execute(input: SetActiveCatalogInput): Promise<{ catalogId: string }> {
    await this.appConfigRepository.setConfig(APP_CONFIG_ACTIVE_CATALOG_KEY, input.catalogId)
    return { catalogId: input.catalogId }
  }
}
