# Segurança — Pendências e Melhorias

> Mapa do que já está protegido e o que precisa ser implementado.  
> Ordenado por prioridade. Marcar como `[x]` conforme for concluído.

---

## O que já está protegido

| Camada | Como | Status |
|---|---|---|
| Tráfego (HTTPS/TLS) | Railway termina TLS automaticamente em todos os serviços | ✅ |
| Autenticação | JWT com refresh token + blacklist no Redis | ✅ |
| Senhas | Hash bcrypt antes de salvar no banco | ✅ |
| Validação de inputs | Zod valida e sanitiza todos os endpoints | ✅ |
| Secrets / credenciais | Variáveis de ambiente no Railway (nunca no código) | ✅ |
| Banco de dados | PostgreSQL não exposto publicamente — só acessado pela API internamente | ✅ |
| Autenticação de rotas | Middleware `authenticate` + `authorize` em todas as rotas sensíveis | ✅ |

---

## Pendências de Segurança

### 🔴 Alta Prioridade

#### [ ] 1. Rate Limiting nas rotas de autenticação e API pública

**Risco:** sem limite de requisições, qualquer pessoa pode fazer brute-force na rota `/api/auth/login` ou derrubar a API com flood de requests.

**O que fazer:**
- Adicionar rate limiting global e por IP
- Limite mais restritivo nas rotas de login: ex. 5 tentativas por IP a cada 15 minutos
- Limite geral: ex. 100 req/min por IP nas demais rotas

**Como implementar:**
```ts
// apps/api/src/infra/http/middlewares/rateLimit.ts
// Usar Redis para contar requisições por IP
// Ou biblioteca como: express-rate-limit + rate-limit-redis
```

**Arquivos a alterar:**
- `apps/api/src/infra/http/router.ts` — aplicar middleware global
- `apps/api/src/modules/auth/infra/http/AuthRoutes.ts` — limite mais restritivo no login

---

#### [ ] 2. Validação de assinatura do Webhook WhatsApp (HMAC-SHA256)

**Risco:** hoje o endpoint `/webhook` aceita qualquer POST, de qualquer origem. Um atacante pode enviar webhooks falsos simulando mensagens de clientes.

**O que fazer:**
- A Meta envia o header `X-Hub-Signature-256: sha256=<hash>`
- Validar o hash HMAC usando o `APP_SECRET` do Meta App antes de processar

**Como implementar:**
```ts
// apps/api/src/modules/webhook/infra/http/WebhookRoutes.ts
import { createHmac, timingSafeEqual } from 'crypto'

function validateMetaSignature(body: Buffer, signature: string, secret: string): boolean {
  const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
```

**Variável de ambiente necessária:**
```
WHATSAPP_APP_SECRET=<app_secret_do_meta_for_developers>
```

**Arquivos a alterar:**
- `apps/api/src/modules/webhook/infra/http/WebhookController.ts`
- `apps/api/src/modules/webhook/infra/http/WebhookRoutes.ts`

---

#### [ ] 3. Backups criptografados antes de subir para armazenamento externo

**Risco:** se o bucket R2/S3 for comprometido, os dados do banco ficam expostos em texto claro.

**O que fazer:**
- Criptografar o dump com AES-256 antes de fazer upload
- Guardar a chave de criptografia separada do bucket (variável de ambiente ou KMS)

**Como implementar:**
```bash
# Script de backup criptografado
pg_dump $DATABASE_URL | gzip | gpg --batch --symmetric --cipher-algo AES256 \
  --passphrase "$BACKUP_ENCRYPTION_KEY" \
  -o backup-$(date +%Y%m%d).sql.gz.gpg

# Upload para R2
rclone copy backup-*.gpg r2:meu-bucket/backups/
```

**Variável de ambiente necessária:**
```
BACKUP_ENCRYPTION_KEY=<chave_forte_aleatoria_256bits>
```

**Onde configurar:**
- GitHub Actions job agendado (cron diário)
- Ou Railway Cron Job apontando para script

---

### 🟡 Média Prioridade

#### [ ] 4. Headers de segurança HTTP

**Risco:** sem headers de segurança, o browser não tem proteção contra clickjacking, MIME sniffing e injeção de conteúdo.

**O que fazer:**
Adicionar os seguintes headers em todas as respostas:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
```

**Como implementar:**
```ts
// apps/api/src/infra/http/router.ts
// Adicionar middleware de headers antes de todas as rotas
response.setHeader('X-Frame-Options', 'DENY')
response.setHeader('X-Content-Type-Options', 'nosniff')
// ...
```

**Arquivos a alterar:**
- `apps/api/src/infra/http/router.ts`

---

#### [ ] 5. CORS restrito ao domínio do frontend

**Risco:** se o CORS aceitar qualquer origem (`*`), qualquer site malicioso pode fazer requisições autenticadas em nome do usuário.

**O que fazer:**
- Fixar `Access-Control-Allow-Origin` para os domínios reais do frontend
- Listar explicitamente os métodos e headers permitidos

**Como implementar:**
```ts
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'https://financing-frontend-production.up.railway.app',
].filter(Boolean)

// Validar origin a cada request
```

**Arquivos a alterar:**
- `apps/api/src/infra/http/router.ts` ou middleware de CORS existente

---

#### [ ] 6. Logs de auditoria de ações sensíveis

**Risco:** sem rastreabilidade, se um atendente fizer algo indevido (ex: vazar dados de cliente) não há como identificar.

**O que fazer:**
Registrar em tabela de auditoria:
- Takeover / release de conversa (quem, quando, qual número)
- Envio de template HSM (quem enviou)
- Finalização de conversa
- Alterações em configurações
- Login / logout por usuário

**Schema sugerido:**
```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  action      TEXT NOT NULL,  -- 'takeover', 'send_template', 'finalize', etc.
  target      TEXT,           -- whatsapp number ou entidade afetada
  metadata    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

**Arquivos a criar/alterar:**
- `apps/api/src/modules/audit/` — novo módulo
- Middlewares nos controllers sensíveis

---

### 🟢 Baixa Prioridade (boas práticas)

#### [ ] 7. Renovação automática e rotação de tokens JWT

**O que fazer:**
- Definir TTL curto para access token (15 min) e longo para refresh (30 dias)
- Implementar rotação de refresh token a cada uso (invalidar o anterior)

---

#### [ ] 8. Proteção contra SQL Injection (revisão)

**Status atual:** Drizzle ORM usa queries parametrizadas por padrão — risco baixo.  
**Ação:** revisar qualquer uso de `sql.raw()` ou interpolação direta de strings em queries.

---

#### [ ] 9. Criptografia de dados sensíveis no banco

**O que fazer:**
Campos como CPF, data de nascimento e renda familiar deveriam ser criptografados em repouso com AES-256 usando chave de aplicação (não a chave do banco).

```ts
// Criptografar antes de salvar, descriptografar ao ler
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
```

**Impacto:** impossibilita busca direta por esses campos — requer ajuste nas queries de search.

---

#### [ ] 10. Política de senhas e 2FA para atendentes

**O que fazer:**
- Exigir senha mínima de 12 caracteres com complexidade
- Implementar 2FA via TOTP (Google Authenticator) para usuários com perfil `admin`

---

## Resumo de Prioridades

| # | Item | Prioridade | Esforço estimado |
|---|---|---|---|
| 1 | Rate limiting | 🔴 Alta | 2–4h |
| 2 | Validação webhook WhatsApp (HMAC) | 🔴 Alta | 2–3h |
| 3 | Backups criptografados | 🔴 Alta | 3–5h |
| 4 | Headers de segurança HTTP | 🟡 Média | 1–2h |
| 5 | CORS restrito | 🟡 Média | 1h |
| 6 | Logs de auditoria | 🟡 Média | 6–10h |
| 7 | Rotação de refresh token | 🟢 Baixa | 3–4h |
| 8 | Revisão SQL Injection | 🟢 Baixa | 1–2h |
| 9 | Criptografia de campos sensíveis | 🟢 Baixa | 8–12h |
| 10 | Política de senhas + 2FA | 🟢 Baixa | 8–15h |

**Estimativa total:** ~35–58h de desenvolvimento para cobrir todos os itens.  
**Recomendação:** implementar os itens 1, 2 e 3 antes de onboarding do primeiro cliente real.
