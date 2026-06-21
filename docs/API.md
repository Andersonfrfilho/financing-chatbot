# API Reference — Financiamento Bot

**Base URL:** `http://localhost:3333`  
**Autenticação:** Bearer JWT (exceto `/api/auth/login`, `/api/webhook/whatsapp`)

---

## Auth

### POST /api/auth/login
```json
{ "email": "string", "password": "string" }
→ { "accessToken": "string", "refreshToken": "string", "user": { "id", "name", "email", "role" } }
```

### POST /api/auth/refresh
```json
{ "refreshToken": "string" }
→ { "accessToken": "string" }
```

### POST /api/auth/logout
```json
{ "refreshToken": "string" }
→ 204 No Content
```

---

## Simulações

### POST /api/simulations
Requer: `simulations:create`
```json
{
  "financingType": "imobiliario|veiculo|pessoal|consignado|empresa|equipamento|rural",
  "requestedAmount": 300000,
  "downPaymentAmount": 30000,
  "termMonths": 360,
  "fgtsAmount": 15000,
  "propertyValue": 350000,
  "propertyType": "residencial",
  "propertyCity": "São Paulo",
  "propertyState": "SP",
  "vehicleType": "carro",
  "vehicleYear": 2022,
  "metadata": {}
}
→ {
  "simulation": { "id", "financingType", "requestedAmount", "termMonths", ... },
  "results": [
    {
      "bankName": "CAIXA",
      "amortizationSystem": "SAC",
      "firstInstallment": 2850.00,
      "lastInstallment": 850.00,
      "totalInterest": 150000,
      "totalCost": 420000,
      "cetAnnual": 0.092
    }
  ]
}
```

### GET /api/simulations/:id
Requer: `simulations:read`

---

## Clientes

### GET /api/clients?search=&city=&state=&page=1&limit=20
Requer: `clients:read`

### GET /api/clients/:id
Requer: `clients:read`

### PUT /api/clients/:id
Requer: `clients:write`
```json
{ "name": "string", "email": "string", "city": "string", "state": "SP" }
```

### DELETE /api/clients/:id
Requer: `clients:delete` — soft delete

---

## Leads

### GET /api/leads?status=&assignedTo=&startDate=&endDate=&page=1&limit=20
Requer: `leads:read`

### GET /api/leads/:id
Requer: `leads:read`

### PATCH /api/leads/:id
Requer: `leads:write`
```json
{ "status": "em_atendimento", "assignedTo": "uuid", "notes": "string" }
```

---

## Bancos

### GET /api/banks?active=true
Lista bancos. Pública para usuários autenticados.

### GET /api/banks/:id/rates?modality=SFH
Requer: `banks:read`

### POST /api/banks/:id/rates
Requer: `banks:write`
```json
{
  "modality": "SFH",
  "rateAnnual": "0.082",
  "minTermMonths": 12,
  "maxTermMonths": 420,
  "maxLtv": "0.90",
  "effectiveDate": "2026-06-01",
  "source": "manual"
}
```

---

## Usuários

### GET /api/users?search=&roleId=&active=true&page=1
Requer: `users:read`

### POST /api/users
Requer: `users:write`
```json
{ "name": "string", "email": "string", "password": "string", "roleId": "uuid" }
```

### PUT /api/users/:id
Requer: `users:write`

### GET /api/roles
Lista perfis. Requer autenticação.

---

## Sessões

### GET /api/sessions?state=&startDate=&endDate=
Requer: `sessions:read`

### GET /api/sessions/stats
Requer: `sessions:read` — retorna contagem por estado

### DELETE /api/sessions/:whatsappNumber
Requer: `sessions:write` — reseta sessão do usuário

---

## Dashboard

### GET /api/dashboard/stats
Requer: `dashboard:read`
```json
{
  "leads": { "total": 0, "byStatus": {}, "newToday": 0, "newThisWeek": 0 },
  "clients": { "total": 0, "newToday": 0, "newThisWeek": 0 },
  "simulations": { "total": 0, "byFinancingType": {}, "todayTotal": 0 },
  "sessions": { "active": 0, "byState": {} }
}
```

### GET /api/dashboard/commercial?startDate=&endDate=
Requer: `dashboard:read`

---

## Webhook WhatsApp

### GET /api/webhook/whatsapp?hub.mode=subscribe&hub.challenge=xxx&hub.verify_token=yyy
Resposta ao challenge da Meta

### POST /api/webhook/whatsapp
Recebe mensagens do WhatsApp Cloud API. Autenticado via HMAC-SHA256.

---

## WebSocket

**URL:** `ws://localhost:3333/ws?token=JWT`

**Eventos:**
| Evento | Payload |
|--------|---------|
| `lead:created` | `{ leadId, whatsappNumber, financingType }` |
| `lead:updated` | `{ leadId, status, assignedTo }` |
| `simulation:completed` | `{ simulationId, whatsappNumber, resultsCount }` |
| `client:captured` | `{ clientId, name, whatsappNumber }` |
