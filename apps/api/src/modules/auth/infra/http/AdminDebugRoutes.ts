import type { Router } from '@/infra/http/router'
import { seedDatabase } from '@/infra/database/seeds'

const DEBUG_TOKEN = process.env.DEBUG_ADMIN_TOKEN || 'dev-token-change-in-prod'

export function registerAdminDebugRoutes(router: Router): void {
  router.post('/api/admin/reset-seed', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (token !== DEBUG_TOKEN) {
      res.writeStatus('401')
      res.end('Unauthorized')
      return
    }

    try {
      await seedDatabase()
      res.writeStatus('200')
      res.end(JSON.stringify({ message: 'Seed executed successfully' }))
    } catch (error) {
      console.error('[Admin] Seed error:', error)
      res.writeStatus('500')
      res.end(JSON.stringify({ error: String(error) }))
    }
  })
}
