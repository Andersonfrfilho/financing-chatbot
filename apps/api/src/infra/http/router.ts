import type uWS from 'uWebSockets.js'
import { AppError } from '@/shared/errors/AppError'
import type { JwtPayload } from '@/shared/types'
import { logger, sanitizeHeaders } from '@/shared/logger'
import { LOG_EVENTS } from '@/shared/constants/log-events'
import { runWithContext } from '@/shared/request-context'

export type Handler = (request: ParsedRequest, response: ResponseHelper) => Promise<void>

export interface ParsedRequest {
  method: string
  url: string
  headers: Record<string, string>
  params: Record<string, string>
  query: Record<string, string>
  body: unknown
  rawBody: Buffer
  user?: JwtPayload
}

export interface ResponseHelper {
  json(data: unknown, status?: number): void
  error(error: unknown): void
  text(data: string, status?: number): void
}

const log = logger.child('Router')

function buildResponseHelper(res: uWS.HttpResponse, origin: string, isAborted: () => boolean): ResponseHelper {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',')

  function writeHeaders(statusCode: string) {
    res.writeStatus(statusCode)
    res.writeHeader('Content-Type', 'application/json; charset=utf-8')
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      res.writeHeader('Access-Control-Allow-Origin', allowedOrigins.includes('*') ? '*' : origin)
    }
  }

  return {
    json(data: unknown, status = 200) {
      if (isAborted()) return
      const statusText = status === 200 ? '200 OK' : status === 201 ? '201 Created' : `${status}`
      res.cork(() => {
        writeHeaders(statusText)
        res.end(JSON.stringify(data))
      })
    },
    text(data: string, status = 200) {
      if (isAborted()) return
      const statusText = status === 200 ? '200 OK' : status === 201 ? '201 Created' : `${status}`
      res.cork(() => {
        res.writeStatus(statusText)
        res.writeHeader('Content-Type', 'text/plain; charset=utf-8')
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          res.writeHeader('Access-Control-Allow-Origin', allowedOrigins.includes('*') ? '*' : origin)
        }
        res.end(data)
      })
    },
    error(error: unknown) {
      if (isAborted()) return
      if (error instanceof AppError) {
        res.cork(() => {
          writeHeaders(`${error.statusCode}`)
          res.end(JSON.stringify({ error: error.code, message: error.message }))
        })
      } else {
        res.cork(() => {
          writeHeaders('500')
          res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Internal server error' }))
        })
      }
    },
  }
}

async function readBody(res: uWS.HttpResponse, setAborted: () => void): Promise<{ body: unknown; rawBody: Buffer }> {
  return new Promise((resolve) => {
    let buffer = Buffer.alloc(0)
    res.onData((chunk, isLast) => {
      buffer = Buffer.concat([buffer, Buffer.from(chunk)])
      if (isLast) {
        try {
          resolve({ body: buffer.length > 0 ? JSON.parse(buffer.toString()) : {}, rawBody: buffer })
        } catch {
          resolve({ body: {}, rawBody: buffer })
        }
      }
    })
    res.onAborted(() => {
      setAborted()
      resolve({ body: {}, rawBody: Buffer.alloc(0) })
    })
  })
}

export class Router {
  constructor(private readonly app: uWS.TemplatedApp) {}

  private register(method: 'get' | 'post' | 'put' | 'patch' | 'del', path: string, ...handlers: Handler[]): void {
    this.app[method](path, async (res, req) => {
      let aborted = false
      const setAborted = () => { aborted = true }
      const isAborted = () => aborted

      // Must read ALL req properties synchronously before any await
      const headers: Record<string, string> = {}
      req.forEach((key, value) => { headers[key] = value })
      const origin    = req.getHeader('origin')
      const method_   = req.getMethod().toUpperCase()
      const url       = req.getUrl()
      const paramKeys = path.match(/:(\w+)/g)?.map(p => p.slice(1)) ?? []

      const query: Record<string, string> = {}
      const queryString = req.getQuery()
      if (queryString) {
        for (const [key, value] of new URLSearchParams(queryString)) {
          query[key] = value
        }
      }

      const params: Record<string, string> = {}
      paramKeys.forEach((key, i) => {
        params[key] = req.getParameter(i) ?? ''
      })

      let body: unknown = {}
      let rawBody = Buffer.alloc(0)

      if (method !== 'get') {
        const result = await readBody(res, setAborted)
        body = result.body
        rawBody = result.rawBody
      } else {
        // For GET requests, set abort handler before any await
        res.onAborted(setAborted)
      }

      const responseHelper = buildResponseHelper(res, origin, isAborted)
      const parsedRequest: ParsedRequest = { method: method_, url, headers, params, query, body, rawBody }

      await runWithContext(async () => {
        const start = Date.now()

        log.debug(LOG_EVENTS.REQUEST, {
          method: method_,
          url,
          params,
          query,
          headers: sanitizeHeaders(headers),
          ...(method !== 'get' && { body }),
        })

        try {
          for (const handler of handlers) {
            await handler(parsedRequest, responseHelper)
          }
          log.debug(LOG_EVENTS.RESPONSE_OK, { method: method_, url, ms: Date.now() - start })
        } catch (error) {
          if (error instanceof AppError) {
            log.info(LOG_EVENTS.RESPONSE_ERROR, { method: method_, url, code: error.code, status: error.statusCode, ms: Date.now() - start })
          } else {
            log.error(LOG_EVENTS.RESPONSE_UNHANDLED, { method: method_, url, error: String(error), ms: Date.now() - start })
          }
          responseHelper.error(error)
        }
      })
    })
  }

  get(path: string, ...handlers: Handler[]) { this.register('get', path, ...handlers) }
  post(path: string, ...handlers: Handler[]) { this.register('post', path, ...handlers) }
  put(path: string, ...handlers: Handler[]) { this.register('put', path, ...handlers) }
  patch(path: string, ...handlers: Handler[]) { this.register('patch', path, ...handlers) }
  delete(path: string, ...handlers: Handler[]) { this.register('del', path, ...handlers) }
}
