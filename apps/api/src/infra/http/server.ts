import uWS from 'uWebSockets.js'
import { jwtVerify } from 'jose'
import { Router } from './router'
import { logger } from '@/shared/logger'
import { LOG_EVENTS } from '@/shared/constants/log-events'
import { WebSocketHub } from '@/infra/websocket/WebSocketHub'
import { SseHub } from '@/infra/sse/SseHub'
import { buildContainer } from '@/infra/container'
import { checkDatabaseConnection, runMigrations, ensureN8nDatabase } from '@/infra/database/connection'
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
import { registerFipeRoutes } from '@/modules/fipe/infra/http/FipeRoutes'
import { registerConversationRoutes } from '@/modules/conversations/infra/http/ConversationRoutes'

const PORT = parseInt(process.env.PORT ?? '3333')
const NODE_ENV = process.env.NODE_ENV ?? 'development'
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',')

export async function createServer() {
  logger.info(LOG_EVENTS.SERVER_STARTING, { env: NODE_ENV, port: PORT })
  await checkDatabaseConnection()
  await ensureN8nDatabase()
  await runMigrations()
  await checkRedisConnection()

  const app = uWS.App()
  const router = new Router(app)
  const wsHub = new WebSocketHub(app, new RedisProvider())
  const sseHub = new SseHub()
  const container = buildContainer(wsHub, sseHub)

  // SSE: stream ao vivo de uma conversa (Fase C). Aditivo — o painel também faz polling.
  // EventSource não envia header Authorization, então o JWT vem por query (?token=).
  const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'changeme_jwt_32chars')
  app.get('/api/conversations/:whatsapp/stream', (res, req) => {
    let aborted = false
    let unregister: (() => void) | null = null
    let heartbeat: ReturnType<typeof setInterval> | null = null
    res.onAborted(() => {
      aborted = true
      if (heartbeat) clearInterval(heartbeat)
      if (unregister) unregister()
    })

    // Ler tudo do req de forma síncrona ANTES de qualquer await (regra do uWS)
    const whatsapp = req.getParameter(0) ?? ''
    const origin = req.getHeader('origin')
    const token = new URLSearchParams(req.getQuery()).get('token') ?? ''
    const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

    jwtVerify(token, JWT_SECRET)
      .then(() => {
        if (aborted) return
        res.cork(() => {
          res.writeStatus('200 OK')
            .writeHeader('Content-Type', 'text/event-stream')
            .writeHeader('Cache-Control', 'no-cache')
            .writeHeader('Connection', 'keep-alive')
            .writeHeader('Access-Control-Allow-Origin', allowOrigin)
            .write(': connected\n\n')
        })
        const conn = {
          write: (chunk: string) => { if (!aborted) res.cork(() => res.write(chunk)) },
          isAlive: () => !aborted,
        }
        unregister = sseHub.register(`conv:${whatsapp}`, conn)
        heartbeat = setInterval(() => { if (!aborted) conn.write(': keep-alive\n\n') }, 25_000)
      })
      .catch(() => {
        if (aborted) return
        res.cork(() => res.writeStatus('401 Unauthorized').writeHeader('Access-Control-Allow-Origin', allowOrigin).end())
      })
  })

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
  registerFipeRoutes(router, container.fipeController)
  registerConversationRoutes(router, container.conversationController)

  return {
    listen() {
      app.listen(PORT, (token) => {
        if (token) {
          logger.info(LOG_EVENTS.SERVER_READY, { port: PORT, env: NODE_ENV })
        } else {
          logger.error(LOG_EVENTS.SERVER_FAILED, { port: PORT })
          process.exit(1)
        }
      })
    },
  }
}
