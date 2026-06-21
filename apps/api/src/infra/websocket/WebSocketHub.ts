import type uWS from 'uWebSockets.js'
import type { RedisProvider } from '@/infra/redis/RedisProvider'

interface WsMessage {
  event: string
  data: unknown
}

export class WebSocketHub {
  private readonly broadcastChannel = 'ws:broadcast'

  constructor(
    private readonly app: uWS.TemplatedApp,
    private readonly cache: RedisProvider,
  ) {
    this.setupWebSocket()
  }

  private setupWebSocket(): void {
    this.app.ws('/ws', {
      compression: 0,
      maxPayloadLength: 16 * 1024,
      idleTimeout: 60,
      open: (ws) => {
        const topic = (ws as unknown as { topic?: string }).topic ?? 'global'
        ws.subscribe(topic)
      },
      message: () => {},
      close: () => {},
    })
  }

  async publishBroadcast(topic: string, event: string, data: unknown): Promise<void> {
    const message: WsMessage = { event, data }
    this.app.publish(topic, JSON.stringify(message), false)
    await this.cache.set(`${this.broadcastChannel}:${topic}:${event}`, JSON.stringify(data), 5)
  }
}
