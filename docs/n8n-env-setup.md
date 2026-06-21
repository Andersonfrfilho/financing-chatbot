# Configuração de Env Vars — n8n (financiamento-imobiliario-bot)

## Vars a ADICIONAR no n8n do Railway

```env
API_BASE_URL="https://<url-da-api-no-railway>.up.railway.app"
API_INTERNAL_TOKEN="<string-aleatoria-forte-ex-openssl-rand-hex-32>"
```

`API_BASE_URL`: URL pública do serviço API no Railway (ex: `https://financing-chatbot-production.up.railway.app`).  
`API_INTERNAL_TOKEN`: qualquer string forte. Use `openssl rand -hex 32` para gerar.

---

## Vars a CORRIGIR no n8n do Railway

| Variável | Valor atual | Valor correto |
|---|---|---|
| `WEBHOOK_URL` | `https://n8n-whatsapp-flows-production.up.railway.app` | `https://n8n-production-13a48.up.railway.app` |
| `N8N_HOST` | `n8n-whatsapp-flows-production.up.railway.app` | `n8n-production-13a48.up.railway.app` |

---

## Vars a ADICIONAR na API do Railway

```env
INTERNAL_API_TOKEN="<mesma-string-usada-em-API_INTERNAL_TOKEN-acima>"
N8N_WEBHOOK_URL="https://n8n-production-13a48.up.railway.app/webhook/whatsapp-bot"
```

`INTERNAL_API_TOKEN`: mesmo valor do `API_INTERNAL_TOKEN` do n8n. O código da API aceita esse token estático como Bearer (sem expiração).  
`N8N_WEBHOOK_URL`: URL do webhook node no n8n. O backend faz POST aqui ao receber mensagem do WhatsApp.

---

## Resumo do fluxo após configuração

```
Meta → API (HMAC verify)
     → POST N8N_WEBHOOK_URL  (com phone, text, messageId)
          → n8n busca sessão no DB
          → roda máquina de estados
          → POST API_BASE_URL/api/simulations  (Bearer API_INTERNAL_TOKEN)
          → envia reply WhatsApp  (Bearer WHATSAPP_ACCESS_TOKEN)
```

---

## Checklist final antes de testar

- [ ] CI verde (typecheck + docker build passando)
- [ ] Railway fez redeploy da API com `INTERNAL_API_TOKEN` e `N8N_WEBHOOK_URL`
- [ ] n8n tem `API_BASE_URL`, `API_INTERNAL_TOKEN`, `WEBHOOK_URL` e `N8N_HOST` corretos
- [ ] Migrations rodadas no banco (`conversation_sessions`, `financing_clients`, `financing_simulations`)
- [ ] Workflow importado no n8n (CI `Sync n8n Workflows` passou com ✅)
- [ ] Workflow ativo no n8n (painel → toggle Enable)
