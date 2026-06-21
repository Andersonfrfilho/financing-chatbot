import { createServer } from './infra/http/server'

createServer()
  .then((server) => server.listen())
  .catch((error) => {
    console.error('[API] Startup failed:', error)
    process.exit(1)
  })
