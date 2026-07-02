import type uWS from 'uWebSockets.js'
import { Router, type Handler } from './router'

export class GatedRouter extends Router {
  constructor(app: uWS.TemplatedApp, private readonly guard: Handler) {
    super(app)
  }

  post(path: string, ...handlers: Handler[]) { super.post(path, this.guard, ...handlers) }
  put(path: string, ...handlers: Handler[]) { super.put(path, this.guard, ...handlers) }
  patch(path: string, ...handlers: Handler[]) { super.patch(path, this.guard, ...handlers) }
  delete(path: string, ...handlers: Handler[]) { super.delete(path, this.guard, ...handlers) }
}
