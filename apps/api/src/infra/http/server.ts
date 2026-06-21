import uWS from 'uWebSockets.js'
import { Router } from './router'
import { WebSocketHub } from '@/infra/websocket/WebSocketHub'
import { buildContainer } from '@/infra/container'
import { checkDatabaseConnection, runMigrations } from '@/infra/database/connection'
import { checkRedisConnection } from '@/infra/redis/connection'
import { RedisProvider } from '@/infra/redis/RedisProvider'
import { registerAuthRoutes } from '@/modules/auth/infra/http/AuthRoutes'
import { registerSimulationRoutes } from '@/modules/simulations/infra/http/SimulationRoutes'
import { registerWebhookRoutes } from '@/modules/webhook/infra/http/WebhookRoutes'
import { registerClientRoutes } from '@/modules/clients/infra/http/ClientRoutes'
import { registerLeadRoutes } from '@/modules/leads/infra/http/LeadRoutes'
import { registerBankRoutes } from '@/modules/banks/infra/http/BankRoutes'
import { registerUserRoutes } from '@/modules/users/infra/http/UserRoutes'
import { registerSessionRoutes } from '@/modules/sessions/infra/http/SessionRoutes'
import { registerDashboardRoutes } from '@/modules/dashboard/infra/http/DashboardRoutes'

const PORT = parseInt(process.env.PORT ?? '3333')
const NODE_ENV = process.env.NODE_ENV ?? 'development'
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',')

export async function createServer() {
  await checkDatabaseConnection()
  await runMigrations()
  await checkRedisConnection()

  const app = uWS.App()
  const router = new Router(app)
  const wsHub = new WebSocketHub(app, new RedisProvider())
  const container = buildContainer(wsHub)

  // CORS pre-flight
  app.options('/*', (res, req) => {
    const origin = req.getHeader('origin')
    res.cork(() => {
      if (ALLOWED_ORIGINS.includes(origin)) {
        res
          .writeStatus('204 No Content')
          .writeHeader('Access-Control-Allow-Origin', origin)
          .writeHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
          .writeHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          .writeHeader('Access-Control-Max-Age', '86400')
          .end()
      } else {
        res.writeStatus('403 Forbidden').end()
      }
    })
  })

  // Health check
  router.get('/health', async (_request, response) => {
    response.json({ status: 'ok', timestamp: new Date().toISOString(), env: NODE_ENV })
  })

  // Module routes
  registerAuthRoutes(router, container.authController)
  registerSimulationRoutes(router, container.simulationController)
  registerWebhookRoutes(router, container.webhookController)
  registerClientRoutes(router, container.clientController)
  registerLeadRoutes(router, container.leadController)
  registerBankRoutes(router, container.bankController)
  registerUserRoutes(router, container.userController)
  registerSessionRoutes(router, container.sessionController)
  registerDashboardRoutes(router, container.dashboardController)

  return {
    listen() {
      app.listen(PORT, (token) => {
        if (token) {
          console.log(`[API] Listening on port ${PORT} [${NODE_ENV}]`)
        } else {
          console.error(`[API] Failed to listen on port ${PORT}`)
          process.exit(1)
        }
      })
    },
  }
}
