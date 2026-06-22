import type { Router, ParsedRequest, ResponseHelper } from '@/infra/http/router'
import { seedDatabase } from '@/infra/database/seeds'

const DEBUG_TOKEN = process.env.DEBUG_ADMIN_TOKEN || 'dev-token-change-in-prod'

export function registerAdminDebugRoutes(router: Router): void {
  router.post('/api/admin/reset-seed', async (req: ParsedRequest, res: ResponseHelper) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (token !== DEBUG_TOKEN) {
      res.json({ error: 'Unauthorized' }, 401)
      return
    }

    try {
      await seedDatabase()
      res.json({ message: 'Seed executed successfully' }, 200)
    } catch (error) {
      console.error('[Admin] Seed error:', error)
      res.json({ error: String(error) }, 500)
    }
  })
}
