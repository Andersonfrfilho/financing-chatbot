# Precificação e Custos — Financiamento Bot

> Referência para definir planos comerciais e entender o custo operacional da plataforma.  
> Valores em BRL (conversão aproximada USD → BRL a R$ 5,70). Atualizar conforme câmbio.

---

## 1. Custos de Infraestrutura — Railway

O projeto roda com 4 serviços no Railway: **API**, **Web (Nginx)**, **PostgreSQL** e **Redis**.

### Planos Railway

| Plano | Preço base | Inclui | Indicado para |
|---|---|---|---|
| **Hobby** | US$ 5/mês (~R$ 28) | US$ 5 em créditos de uso | testes / staging |
| **Pro** | US$ 20/mês (~R$ 114) | US$ 20 em créditos + SLA | produção |
| **Teams** | US$ 20/mês/usuário | colaboração multi-membro | equipe |

### Estimativa de consumo mensal (produção — 1 cliente)

| Serviço | RAM | vCPU | Estimativa/mês |
|---|---|---|---|
| API (Node/Bun) | 512 MB | 0,5 vCPU | ~R$ 55 |
| Web (Nginx static) | 128 MB | 0,1 vCPU | ~R$ 10 |
| PostgreSQL | 1 GB | 0,5 vCPU | ~R$ 40 |
| Redis | 256 MB | 0,1 vCPU | ~R$ 15 |
| **Total Railway** | | | **~R$ 120–160/mês** |

> Railway cobra por uso real (vCPU/hora + GB RAM/hora). Os valores acima são estimativas para carga baixa/média (~500 sessões/mês). Picos de tráfego aumentam o custo.

### Referência de preço Railway (julho 2025)

- vCPU: US$ 0,000463/min → ~R$ 0,0026/min
- RAM: US$ 0,000231/GB/min → ~R$ 0,0013/GB/min
- Egress (tráfego saída): US$ 0,10/GB após 100 GB grátis/mês

---

## 2. Custos WhatsApp Business API (Meta Cloud API)

A Meta cobra **por conversa** (janela de 24h), não por mensagem individual.

### Categorias de conversa

| Categoria | Quando ocorre | Custo estimado (Brasil) |
|---|---|---|
| **Service** (atendimento) | Cliente inicia a conversa | Grátis* |
| **Utility** (transacional) | Template pós-24h — ex: reengajamento | ~US$ 0,0200 (~R$ 0,11) |
| **Marketing** | Templates promocionais | ~US$ 0,0625 (~R$ 0,36) |
| **Authentication** | OTP / validação | ~US$ 0,0125 (~R$ 0,07) |

> \* **1.000 conversas de serviço por mês são gratuitas** (free tier Meta). Acima disso, ~US$ 0,008 (~R$ 0,05) por conversa.

### Estimativa por volume mensal

| Volume de conversas/mês | Custo Meta estimado |
|---|---|
| até 1.000 (service) | R$ 0 (free tier) |
| 5.000 (service) | ~R$ 200 |
| 5.000 (utility/reengajamento) | ~R$ 550 |
| 10.000 misto | ~R$ 600–1.200 |

### Número WhatsApp Business

- **Número próprio do cliente** (recomendado): gratuito — o cliente registra o número no Meta Business Manager.
- **Número provisionado via BSP** (Business Solution Provider como Twilio, Zenvia, etc.): cobrado à parte pelo BSP — R$ 150–500/mês dependendo do provedor.

---

## 3. Perfil Verificado (Selo Verde ✅)

O **Official Business Account (OBA)** é o selo verde que aparece no nome da empresa no WhatsApp.

### Requisitos

1. Conta no **Meta Business Manager** com verificação de negócio concluída (documento CNPJ + site da empresa).
2. Histórico de conversas consistente (volume relevante).
3. Solicitação via **WhatsApp Manager → Phone numbers → Request official business account**.

### Custo

| Item | Custo |
|---|---|
| Verificação Meta Business | **Gratuito** |
| Selo OBA (Green Badge) | **Gratuito** |
| Consultoria/facilitação (opcional) | R$ 500–2.000 (agências parceiras Meta) |

> O selo **não é garantido** — a Meta aprova conforme critérios internos (tamanho da empresa, volume de mensagens, reputação da marca). Empresas menores frequentemente são aprovadas como **Business Account** (sem selo, mas com nome da empresa exibido).

---

## 4. Planos Comerciais Sugeridos

### Premissas de custo base (1 cliente no Railway compartilhado)

| Item | Custo mensal |
|---|---|
| Infraestrutura Railway (rateada) | R$ 80–120 |
| API WhatsApp (estimativa baixo volume) | R$ 0–100 |
| Suporte e manutenção | R$ 200–400 |
| **Custo total estimado** | **R$ 280–620/mês** |

### Tabela de planos

| | **Essencial** | **Profissional** | **Enterprise** |
|---|---|---|---|
| **Preço/mês** | **R$ 497** | **R$ 997** | **sob consulta** |
| **Preço/ano** | R$ 4.970 (2 meses grátis) | R$ 9.970 (2 meses grátis) | — |
| Agentes simultâneos | 1 | 5 | ilimitado |
| Sessões bot/mês | até 500 | até 2.000 | ilimitado |
| Simulações de financiamento | ✓ | ✓ | ✓ |
| Atendimento humano (takeover) | ✓ | ✓ | ✓ |
| Relatórios e dashboard | básico | completo | personalizado |
| Templates WhatsApp | 1 | 3 | ilimitado |
| Suporte | e-mail (48h) | WhatsApp (24h) | dedicado (4h) |
| Integrações (n8n) | padrão | personalizada | total |

> **Sessões extras:** R$ 80 a cada 500 sessões acima do plano.

### Taxa de setup (única)

| Serviço | Valor |
|---|---|
| Configuração inicial + integração WhatsApp | R$ 800 |
| Com número do cliente já registrado na Meta | R$ 500 |
| Facilitação para perfil verificado (OBA) | R$ 1.200 |

---

## 5. Margens estimadas

| Plano | Receita | Custo operacional | **Margem bruta** |
|---|---|---|---|
| Essencial | R$ 497 | ~R$ 300 | **~40%** |
| Profissional | R$ 997 | ~R$ 450 | **~55%** |
| 5 clientes Essencial | R$ 2.485 | ~R$ 900 | **~64%** |
| 10 clientes mistos | R$ 7.000 | ~R$ 1.800 | **~74%** |

> A margem escala bem pois a infra Railway pode ser compartilhada entre clientes até certo volume (multi-tenant ou instâncias separadas por cliente acima do Profissional).

---

## 6. Fontes de referência

- Railway pricing: https://railway.com/pricing
- Meta WhatsApp pricing (Brasil): https://developers.facebook.com/docs/whatsapp/pricing
- WhatsApp Business Platform: https://business.whatsapp.com/products/platform-pricing
