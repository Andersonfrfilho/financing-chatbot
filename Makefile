.PHONY: setup up down logs ps db-reset db-seed api-shell test typecheck build test-n8n

COMPOSE = docker compose -f infra/docker-compose.yml --env-file infra/.env

# ──────────────────────────────────────────────
# Configuração inicial
# ──────────────────────────────────────────────
setup:
	@echo "→ Criando infra/.env a partir do .env.example..."
	@cp -n infra/.env.example infra/.env || true
	@echo "✓ Edite infra/.env e preencha os tokens da Meta WhatsApp"

# ──────────────────────────────────────────────
# Docker
# ──────────────────────────────────────────────
up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

logs-api:
	$(COMPOSE) logs -f financiamento-api

logs-n8n:
	$(COMPOSE) logs -f financiamento_n8n

ps:
	$(COMPOSE) ps

# ──────────────────────────────────────────────
# Banco de dados
# ──────────────────────────────────────────────
db-reset:
	@echo "→ Recriando schema (DESTRÓI dados)..."
	$(COMPOSE) exec financiamento-api bun run db:generate
	$(COMPOSE) exec financiamento-api bun run db:migrate
	@echo "✓ Schema recriado"

db-seed:
	$(COMPOSE) exec financiamento-api bun run db:seed

db-shell:
	$(COMPOSE) exec postgres psql -U $$(grep POSTGRES_USER infra/.env | cut -d= -f2) -d $$(grep POSTGRES_DB infra/.env | cut -d= -f2)

# ──────────────────────────────────────────────
# Desenvolvimento
# ──────────────────────────────────────────────
typecheck:
	cd apps/api && bun run typecheck

test:
	cd apps/api && bun test

build:
	cd apps/web && bun run build

# ──────────────────────────────────────────────
# Teste WhatsApp (simula mensagem)
# ──────────────────────────────────────────────
# Uso: make test-msg MSG="oi" TEL=5511999999999
test-msg:
	@curl -s -X POST http://localhost:3333/api/webhook/whatsapp \
		-H "Content-Type: application/json" \
		-H "X-Hub-Signature-256: sha256=invalid" \
		-H "X-Request-Id: test-$(shell date +%s)" \
		-d '{"object":"whatsapp_business_account","entry":[{"id":"test","changes":[{"value":{"messaging_product":"whatsapp","messages":[{"id":"msg-test","from":"$(TEL)","type":"text","text":{"body":"$(MSG)"},"timestamp":"$(shell date +%s)"}]}}]}]}' \
		| jq . 2>/dev/null || echo "Webhook enviado (jq não instalado para formatar)"

# ──────────────────────────────────────────────
# Teste Docker local (simula Railway)
# ──────────────────────────────────────────────
docker-build-api:
	docker build -f apps/api/Dockerfile -t financiamento-api-test apps/api

docker-run-api:
	docker run --rm \
		--env-file infra/.env \
		-e DATABASE_URL=$$(grep DATABASE_URL infra/.env | cut -d= -f2-) \
		-e REDIS_URL=$$(grep REDIS_URL infra/.env | cut -d= -f2-) \
		-p 3333:3333 \
		--network financiamento-imobiliario-bot_financiamento_net \
		financiamento-api-test

docker-build-check:
	@echo "→ Build Docker da API..."
	docker build -f apps/api/Dockerfile -t financiamento-api-test apps/api
	@echo "✓ Build OK — sem erros"

# ──────────────────────────────────────────────
# Teste completo n8n (sobe → testa → derruba)
# ──────────────────────────────────────────────
test-n8n:
	@echo "▶ Subindo serviços..."
	$(COMPOSE) up -d
	@echo "⏳ Aguardando healthchecks..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if $(COMPOSE) ps | grep -q '(healthy)'; then break; fi; \
		sleep 3; \
	done
	@echo "▶ Rodando testes do n8n..."
	node scripts/test-n8n-full.mjs
	@RESULT=$$?; \
	echo "▶ Derrubando serviços..."; \
	$(COMPOSE) down; \
	exit $$RESULT

# ──────────────────────────────────────────────
# URLs locais
# ──────────────────────────────────────────────
urls:
	@echo "API:       http://localhost:3333"
	@echo "API docs:  http://localhost:3333/docs"
	@echo "n8n:       http://localhost:5678"
	@echo "Chatwoot:  http://localhost:3010"
	@echo "Directus:  http://localhost:8055"
	@echo "Metabase:  http://localhost:4100"
	@echo "Adminer:   http://localhost:8181"
	@echo "Web app:   http://localhost:5173"
