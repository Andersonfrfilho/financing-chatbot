import type { Router } from '@/infra/http/router'
import type { ClientController } from './ClientController'
import { authenticate } from '@/infra/http/middlewares/authenticate'
import { authorize } from '@/infra/http/middlewares/authorize'

export function registerClientRoutes(router: Router, controller: ClientController) {
  // Interno (n8n): reconhecimento por CPF — só authenticate (token de serviço), antes de :id
  router.get('/api/clients/by-document', authenticate, (req, res) => controller.byDocument(req, res))
  router.get('/api/clients',    authenticate, authorize(['clients:read']),  (req, res) => controller.list(req, res))
  router.post('/api/clients',   authenticate, authorize(['clients:write']), (req, res) => controller.create(req, res))
  router.get('/api/clients/:id',authenticate, authorize(['clients:read']),  (req, res) => controller.get(req, res))
  router.put('/api/clients/:id',authenticate, authorize(['clients:write']), (req, res) => controller.update(req, res))
  router.delete('/api/clients/:id',authenticate, authorize(['clients:delete']),(req, res) => controller.remove(req, res))
}
