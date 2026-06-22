# Spec: Milestone 6 — Atendimento ao Vivo (Histórico + Chat Humano)

**Status:** Fases A, B, D e E implementadas (transcript, histórico, takeover/envio, fila+não-lidas). Falta só C (SSE ao vivo — hoje coberto por polling).
**Escopo:** F-030, F-031, F-032, F-033, F-034

### Decisões travadas
- **Transporte:** polling nas Fases A/B (zero conexão persistente — seguro no Railway); **SSE** (não WS) na Fase C, por reconexão nativa do `EventSource`, resiliência a redeploy e custo menor no nosso uso unidirecional. WS global não será expandido.
- **Envio outbound (Q-4):** a **API chama a Graph API direto** (`WhatsAppSender`), desacoplado do n8n.
- **Início:** Fases A + B juntas.
**Depende de:** F-016 (handoff), F-021 (leads), F-027 (painel atendimento), `conversation_sessions`, `WebSocketHub`

---

## Visão Geral

Hoje o bot processa e responde via n8n, mas **nenhuma mensagem é persistida** — só guardamos `current_state` + `context` em `conversation_sessions`. Não há histórico de conversa nem forma do atendente conversar pelo painel.

Esta milestone entrega:
1. **Persistência de toda mensagem** (entrada/saída) — fundação de tudo.
2. **Histórico de conversa** no painel (transcript estilo chat).
3. **Tempo real custo-consciente** para ver mensagens chegando ao vivo.
4. **Takeover humano**: pausar o bot e o atendente assumir a conversa.
5. **Fila de atendimento** + notificação de quem pediu consultor.

### Objetivos
- Atendente vê o histórico completo de qualquer conversa.
- Atendente assume uma conversa, o bot pausa, e ele responde pelo painel.
- Mensagens do cliente aparecem ao vivo **sem manter conexões caras sempre abertas**.

### Não-objetivos (fora de escopo nesta milestone)
- Envio de mídia (imagem/áudio/documento) pelo atendente — só texto no MVP.
- Templates HSM / janela de 24h do WhatsApp (tratar como melhoria futura).
- Multi-atendente simultâneo na MESMA conversa (1 atendente por conversa).
- Chatbot com IA / respostas sugeridas.

---

## Princípio de Arquitetura de Tempo Real (custo)

> WebSocket é caro no nosso ambiente (Railway / n8n self-hosted): conexão full-duplex
> sempre aberta, por usuário, consumindo recurso mesmo ocioso. O desenho abaixo trata isso.

**Regra de ouro:** a **fonte de verdade é o banco** (`conversation_messages`). Tempo real é só uma **camada de notificação** por cima — a conversa nunca depende dela para funcionar (sempre dá pra recarregar via HTTP).

**O chat é assimétrico:**
- **Atendente → cliente (enviar):** `HTTP POST` comum. Não precisa de tempo real.
- **Cliente → atendente (receber):** precisa de *push* servidor→cliente, **só enquanto a conversa está aberta na tela**.

### Transporte em camadas

| Camada | Caso de uso | Transporte | Custo |
|--------|-------------|------------|-------|
| T0 (base) | Carregar/recarregar histórico | `GET` paginado | mínimo |
| T1 (recomendado) | Mensagens chegando na conversa **aberta** | **SSE** escopado a 1 conversa | baixo |
| T2 (fila/badges) | "Nova conversa aguardando", contadores | Polling 15–30s **ou** 1 SSE "lobby" leve | baixo |
| Evitar | Broadcast global de todos os eventos p/ todos os usuários | WS global sempre aberto | alto |

**Por que SSE e não WS aqui:** o fluxo é unidirecional (servidor→cliente) para o que importa em tempo real. SSE roda sobre HTTP/1.1+, tem **reconexão automática nativa** (`EventSource`), não exige handshake bidirecional e é mais barato de manter aberto. O envio do atendente é um POST normal — não justifica full-duplex.

### Regras de conexão (R-RT)

| ID | Regra |
|----|-------|
| R-RT-1 | SSE é aberto **somente** quando o atendente entra numa conversa; fechado ao sair. |
| R-RT-2 | Nunca abrir conexão persistente **global por usuário** recebendo todos os eventos. |
| R-RT-3 | Escopo do stream: apenas a conversa aberta (`conv:<whatsapp>`); um stream por aba. |
| R-RT-4 | Fila de atendimento usa **polling** (15–30s) ou um único SSE "lobby" com eventos leves (só id+contadores), nunca o conteúdo das mensagens. |
| R-RT-5 | Fallback sem SSE: polling do endpoint de mensagens a cada N s enquanto a tela está aberta. Tudo segue funcionando. |
| R-RT-6 | `idleTimeout` + heartbeat (`: keep-alive` a cada ~25s) para derrubar streams mortos. |
| R-RT-7 | O `WebSocketHub` atual permanece só para eventos de baixo volume já existentes (lead/simulação); **não** expandir WS para mensagens. Reavaliar migrar esses para SSE depois. |

---

## F-030: Persistência de Mensagens (fundação)

### Entidade `conversation_messages`

| ID | Campo | Tipo | Descrição |
|----|-------|------|-----------|
| R-030-1 | `id` | uuid PK | — |
| R-030-2 | `whatsapp_number` | varchar(20), index | Conversa/cliente |
| R-030-3 | `direction` | varchar | `inbound` \| `outbound` |
| R-030-4 | `sender` | varchar | `customer` \| `bot` \| `agent` |
| R-030-5 | `agent_user_id` | uuid null | Atendente que enviou (quando `sender=agent`) |
| R-030-6 | `type` | varchar | `text` \| `interactive` \| `system` (mídia: futuro) |
| R-030-7 | `content` | text | Corpo renderizado / seleção do usuário |
| R-030-8 | `payload` | jsonb null | Estrutura crua (botões/lista, seleção, metadados) |
| R-030-9 | `wa_message_id` | varchar null, index | ID do WhatsApp (dedup/status) |
| R-030-10 | `status` | varchar null | `received`/`sent`/`delivered`/`read`/`failed` |
| R-030-11 | `created_at` | timestamptz | — |

### Regras

| ID | Regra |
|----|-------|
| R-030-12 | Índice `(whatsapp_number, created_at)` para paginação do histórico. |
| R-030-13 | Dedup por `wa_message_id` (inbound do WhatsApp pode repetir) — ignora duplicado. |
| R-030-14 | Sem criptografia do conteúdo no MVP; **não logar** dados sensíveis avulsos (CPF, renda) — eles já vivem em `financing_clients`. Reavaliar LGPD antes de produção. |
| R-030-15 | Migration segue padrão do repo (`drizzle/migrations/000X_*.sql` + journal). Coluna nova sem enum (usar varchar, lição do Milestone anterior). |

### Endpoint interno (n8n → API)

| ID | Requisito |
|----|-----------|
| R-030-16 | `POST /api/conversations/:whatsapp/messages` (auth de serviço) — persiste 1 mensagem e **emite** para os streams SSE abertos daquela conversa. Body: `{ direction, sender, type, content, payload?, waMessageId?, status? }`. |
| R-030-17 | O n8n loga **inbound** (no início do fluxo) e **outbound do bot** (após enviar) chamando esse endpoint via `this.helpers.httpRequest`. |
| R-030-18 | A persistência é *fire-and-forget* tolerante: se a API falhar, o bot **não** trava (timeout curto, erro engolido). |

---

## F-031: Histórico de Conversa (API + Painel)

| ID | Requisito |
|----|-----------|
| R-031-1 | `GET /api/conversations/:whatsapp/messages?before=<cursor>&limit=50` — histórico paginado (cursor por `created_at`/`id`), ordem cronológica. |
| R-031-2 | `GET /api/conversations?status=&assignedTo=&q=&page=` — lista de conversas com: último trecho, `mode`, `assigned_user`, `unread`, `last_inbound_at`, dados do cliente (nome). |
| R-031-3 | Painel: tela de conversa estilo chat (bolhas in/out, sender, timestamp, tipo). Reusa `SessionsPage`/`Painel Atendimento` (F-027). |
| R-031-4 | Mensagens interativas renderizadas de forma legível (ex.: "selecionou: 🚗 Veículo"). |
| R-031-5 | Scroll infinito para trás (carrega páginas antigas via cursor). |

---

## F-032: Tempo Real (SSE escopado)

| ID | Requisito |
|----|-----------|
| R-032-1 | `GET /api/conversations/:whatsapp/stream` (SSE, auth) — emite eventos `message` (nova mensagem) e `status` (status de entrega) **apenas** daquela conversa. |
| R-032-2 | Fan-out: o endpoint de persistência (R-030-16) e o de envio (R-033) empurram para os streams abertos da conversa. Implementação: registry em memória `whatsapp → Set<sseClient>` (single-instance) + heartbeat. |
| R-032-3 | Multi-instância (se houver scale-out): usar **Postgres LISTEN/NOTIFY** ou Redis pub/sub para propagar entre instâncias. Documentar como evolução; MVP assume instância única. |
| R-032-4 | Frontend usa `EventSource` (reconexão automática); abre ao entrar na conversa, `.close()` ao sair (R-RT-1). |
| R-032-5 | Lobby/fila: polling 15–30s OU SSE `GET /api/conversations/stream` só com eventos leves (`{whatsapp, unread, waitingHuman}`). Decisão em "Questões em aberto". |

---

## F-033: Takeover Humano (pausa do bot + envio)

### `conversation_sessions` — campos novos

| ID | Campo | Tipo | Descrição |
|----|-------|------|-----------|
| R-033-1 | `mode` | varchar default `bot` | `bot` \| `human` (quando `human`, o bot não responde) |
| R-033-2 | `assigned_user_id` | uuid null | Atendente dono da conversa |
| R-033-3 | `human_requested_at` | timestamptz null | Quando pediu consultor (fila) |
| R-033-4 | `last_inbound_at` | timestamptz null | Para SLA/"não lido" |
| R-033-5 | `last_agent_read_at` | timestamptz null | Badge de não lidas |

### Comportamento

| ID | Requisito |
|----|-----------|
| R-033-6 | `POST /api/conversations/:whatsapp/takeover` — `mode=human`, `assigned_user_id=<eu>`. Idempotente; bloqueia se já tem outro atendente (409). |
| R-033-7 | `POST /api/conversations/:whatsapp/release` — `mode=bot`, limpa assignee; o bot volta a responder. |
| R-033-8 | `POST /api/conversations/:whatsapp/send` — atendente envia texto: a **API chama a Graph API do WhatsApp**, persiste `outbound/agent` e emite SSE. |
| R-033-9 | **Bot pausa:** no início do Roteador (n8n), checar `session.mode`. Se `human`: persistir inbound (R-030-17) e **encerrar sem responder**. |
| R-033-10 | Quando o cliente pede consultor (handoff F-016): setar `human_requested_at` e marcar a conversa como "aguardando humano" (entra na fila). Opcional: auto-`mode=human` ou só sinalizar. |
| R-033-11 | Envio outbound exige **token Graph na API** (`WHATSAPP_ACCESS_TOKEN`, `phone_number_id`). Hoje só o n8n tem; adicionar um `WhatsAppSender` na API. |
| R-033-12 | Tratar janela de 24h do WhatsApp: se fora da janela, retornar erro claro ("fora da janela de 24h, requer template") — implementação de template fica para depois. |

---

## F-034: Fila de Atendimento e Notificações

| ID | Requisito |
|----|-----------|
| R-034-1 | `GET /api/conversations?waitingHuman=true` — fila de quem pediu consultor / está em modo humano sem assignee. |
| R-034-2 | Badge/contador no painel: nº de conversas aguardando + não lidas (via T2 polling/lobby). |
| R-034-3 | Evento de "nova conversa aguardando" reutiliza o WS de baixo volume existente (lead/handoff) ou o lobby SSE. |
| R-034-4 | (Opcional) Notificação sonora/visual no painel quando entra alguém na fila. |

---

## Contratos de API (resumo)

```
# Mensagens / histórico
POST   /api/conversations/:whatsapp/messages     (interno, n8n) → persiste + emite
GET    /api/conversations/:whatsapp/messages      ?before=&limit=  → histórico
GET    /api/conversations                         ?status=&assignedTo=&waitingHuman=&q=&page=
GET    /api/conversations/:whatsapp/stream         (SSE) eventos: message, status
# Atendimento
POST   /api/conversations/:whatsapp/takeover
POST   /api/conversations/:whatsapp/release
POST   /api/conversations/:whatsapp/send          { text }
POST   /api/conversations/:whatsapp/read           (marca lidas)
```
Auth: endpoints de painel via JWT + RBAC (`conversations:read` / `conversations:write`); `:whatsapp/messages` (log do n8n) via token de serviço, só `authenticate`.

---

## Mudanças no n8n

| ID | Requisito |
|----|-----------|
| R-N8N-1 | No início do Roteador: buscar `mode` da sessão; se `human`, logar inbound e sair sem responder. |
| R-N8N-2 | Logar **inbound** (após extrair a mensagem) e **outbound do bot** (após "Enviar WhatsApp") via `POST /api/conversations/:whatsapp/messages`. |
| R-N8N-3 | Reusar `apiGet`/novo `apiPost` (com `this.helpers.httpRequest`) — `fetch` não existe no sandbox do Code node. |

---

## Critérios de Aceite

| ID | Critério |
|----|----------|
| A-1 | Toda mensagem (cliente, bot, atendente) aparece em `conversation_messages`. |
| A-2 | Painel mostra o transcript completo e paginado de uma conversa. |
| A-3 | Com a conversa aberta, mensagem nova do cliente aparece ao vivo via SSE; fechando a tela, o stream fecha. |
| A-4 | "Assumir conversa" pausa o bot: o cliente para de receber respostas automáticas; o atendente responde pelo painel e o cliente recebe no WhatsApp. |
| A-5 | "Devolver ao bot" reativa as respostas automáticas. |
| A-6 | Nenhuma conexão WS/SSE global sempre aberta por usuário — só a da conversa em foco. |
| A-7 | Se a API de mensagens cair, o bot continua respondendo (log é tolerante a falha). |

---

## Faseamento (ordem de implementação)

1. **Fase A — Fundação:** F-030 (tabela + migration + endpoint de log) + n8n logando inbound/outbound. Já dá histórico via `GET`.
2. **Fase B — Histórico no painel:** F-031 (endpoints de lista/histórico + tela de chat read-only).
3. **Fase C — Tempo real:** F-032 (SSE escopado + EventSource no painel).
4. **Fase D — Takeover:** F-033 (`mode`, pausa do bot, `WhatsAppSender` na API, envio pelo painel).
5. **Fase E — Fila:** F-034 (fila + badges + notificação).

---

## Questões em Aberto (decisões do usuário)

| # | Questão | Recomendação |
|---|---------|--------------|
| Q-1 | Lobby/fila: polling simples ou SSE "lobby"? | **Polling 20s** no MVP (mais barato/simples); SSE lobby só se a fila ficar movimentada. |
| Q-2 | Ao pedir consultor, auto-pausa o bot ou só sinaliza? | **Só sinaliza** (entra na fila); o atendente decide assumir. Evita travar quem só clicou sem querer. |
| Q-3 | Persistir mensagens do bot também (não só cliente/atendente)? | **Sim** — histórico completo ajuda o atendente a entender o contexto. |
| Q-4 | Envio outbound: API chama Graph direto (a) ou dispara webhook do n8n (b)? | **(a)** `WhatsAppSender` na API — desacopla do n8n, menos saltos. |
| Q-5 | Instância única ou pode escalar horizontalmente? | Se único: registry em memória basta. Se escalar: Redis pub/sub. **MVP assume único.** |
