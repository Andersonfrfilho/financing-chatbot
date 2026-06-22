export interface SseConnection {
  write: (chunk: string) => void
  isAlive: () => boolean
}

// Registry em memória de conexões SSE por tópico (ex.: "conv:<whatsapp>").
// Tempo real é só uma camada por cima do banco (fonte de verdade) — se cair, o polling cobre.
// Single-instance: para scale-out, propagar via Redis pub/sub (ver spec, F-032 R-032-3).
export class SseHub {
  private topics = new Map<string, Set<SseConnection>>()

  register(topic: string, conn: SseConnection): () => void {
    let set = this.topics.get(topic)
    if (!set) {
      set = new Set()
      this.topics.set(topic, set)
    }
    set.add(conn)
    return () => {
      const s = this.topics.get(topic)
      if (s) {
        s.delete(conn)
        if (s.size === 0) this.topics.delete(topic)
      }
    }
  }

  emit(topic: string, event: string, data: unknown): void {
    const set = this.topics.get(topic)
    if (!set || set.size === 0) return
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const conn of set) {
      if (conn.isAlive()) conn.write(payload)
    }
  }
}
