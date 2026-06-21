import type uWS from 'uWebSockets.js'
import { AppError } from '@/shared/errors/AppError'
import type { JwtPayload } from '@/shared/types'

export type Handler = (request: ParsedRequest, response: ResponseHelper) => Promise<void>

export interface ParsedRequest {
  method: string
  url: string
  headers: Record<string, string>
  params: Record<string, string>
  query: Record<string, string>
  body: unknown
  user?: JwtPayload
}

export interface ResponseHelper {
  json(data: unknown, status?: number): void
  error(error: unknown): void
}

function buildResponseHelper(res: uWS.HttpResponse, req: uWS.HttpRequest): ResponseHelper {
  const origin = req.getHeader('origin')
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',')

  function writeHeaders(statusCode: string) {
    res.writeStatus(statusCode)
    res.writeHeader('Content-Type', 'application/json; charset=utf-8')
    if (allowedOrigins.includes(origin)) {
      res.writeHeader('Access-Control-Allow-Origin', origin)
    }
  }

  return {
    json(data: unknown, status = 200) {
      const statusText = status === 200 ? '200 OK' : status === 201 ? '201 Created' : `${status}`
      res.cork(() => {
        writeHeaders(statusText)
        res.end(JSON.stringify(data))
      })
    },
    error(error: unknown) {
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

async function readBody(res: uWS.HttpResponse): Promise<unknown> {
  return new Promise((resolve) => {
    let buffer = Buffer.alloc(0)
    res.onData((chunk, isLast) => {
      buffer = Buffer.concat([buffer, Buffer.from(chunk)])
      if (isLast) {
        try {
          resolve(buffer.length > 0 ? JSON.parse(buffer.toString()) : {})
        } catch {
          resolve({})
        }
      }
    })
    res.onAborted(() => resolve({}))
  })
}

export class Router {
  constructor(private readonly app: uWS.TemplatedApp) {}

  private register(method: 'get' | 'post' | 'put' | 'patch' | 'del', path: string, ...handlers: Handler[]): void {
    this.app[method](path, async (res, req) => {
      res.onAborted(() => {})

      const headers: Record<string, string> = {}
      req.forEach((key, value) => { headers[key] = value })

      const query: Record<string, string> = {}
      const queryString = req.getQuery()
      if (queryString) {
        for (const [key, value] of new URLSearchParams(queryString)) {
          query[key] = value
        }
      }

      const body = method !== 'get' ? await readBody(res) : {}
      const responseHelper = buildResponseHelper(res, req)

      const parsedRequest: ParsedRequest = {
        method: req.getMethod().toUpperCase(),
        url: req.getUrl(),
        headers,
        params: {},
        query,
        body,
      }

      try {
        for (const handler of handlers) {
          await handler(parsedRequest, responseHelper)
        }
      } catch (error) {
        responseHelper.error(error)
      }
    })
  }

  get(path: string, ...handlers: Handler[]) { this.register('get', path, ...handlers) }
  post(path: string, ...handlers: Handler[]) { this.register('post', path, ...handlers) }
  put(path: string, ...handlers: Handler[]) { this.register('put', path, ...handlers) }
  patch(path: string, ...handlers: Handler[]) { this.register('patch', path, ...handlers) }
  delete(path: string, ...handlers: Handler[]) { this.register('del', path, ...handlers) }
}
