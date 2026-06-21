import { AsyncLocalStorage } from 'async_hooks'
import { randomUUID } from 'crypto'

interface RequestContext {
  reqId: string
}

const storage = new AsyncLocalStorage<RequestContext>()

export function runWithContext<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({ reqId: randomUUID().slice(0, 8) }, fn)
}

export function getReqId(): string | undefined {
  return storage.getStore()?.reqId
}
