# Precificação e Custos — Financiamento Bot

> Referência para definir planos comerciais e entender o custo operacional da plataforma.  
> Valores em BRL (conversão aproximada USD → BRL a R$ 5,70). Atualizar conforme câmbio.  
> **Premissa:** dois ambientes ativos (Staging + Produção), divisão de 50% da receita líquida entre os sócios.

---

## 1. Cenário Base: 3 Usuários · 24/7 · Backup Seguro

Este é o cenário de **um cliente real em produção** com 3 atendentes, disponibilidade contínua e backup diário do banco.

### O que esse cenário exige

| Requisito | Solução | Observação |
|---|---|---|
| 3 usuários simultâneos | Plano Railway Pro (sempre ligado) | Sem suspensão automática |
| Disponibilidade 24/7 | Serviços com restart automático | Railway garante por padrão no Pro |
| Backup seguro do banco | Railway Postgres backup diário + exportação externa | Detalhado abaixo |
| Monitoramento de uptime | UptimeRobot (gratuito) ou Better Uptime | Alertas por e-mail/WhatsApp |

---

## 2. Custos de Infraestrutura — Railway

O projeto roda com 4 serviços por ambiente: **API**, **Web (Nginx)**, **PostgreSQL** e **Redis**.  
São **dois ambientes permanentes**: Staging (STG) e Produção (PROD).

### Planos Railway necessários

| Ambiente | Plano Railway | Custo base/mês |
|---|---|---|
| **Produção (PROD)** | Pro | US$ 20 (~R$ 114) |
| **Staging (STG)** | Hobby | US$ 5 (~R$ 28) |
| **Total base** | | **~R$ 142/mês** |

### Estimativa de consumo — Produção (3 usuários, 24/7)

| Serviço | RAM | vCPU | Estimativa/mês |
|---|---|---|---|
| API (Node/Bun) | 512 MB | 0,5 vCPU | ~R$ 55 |
| Web (Nginx static) | 128 MB | 0,1 vCPU | ~R$ 10 |
| PostgreSQL | 1 GB | 0,5 vCPU | ~R$ 40 |
| Redis | 256 MB | 0,1 vCPU | ~R$ 15 |
| **Subtotal PROD** | | | **~R$ 120–160/mês** |

> Com 3 usuários ativos simultaneamente o consumo de vCPU aumenta levemente nos picos de atendimento, mas o impacto no custo mensal é marginal (Railway cobra pelo uso médio, não pelo pico).

### Estimativa de consumo — Staging (ambiente reduzido)

| Serviço | RAM | vCPU | Estimativa/mês |
|---|---|---|---|
| API | 256 MB | 0,2 vCPU | ~R$ 20 |
| Web | 128 MB | 0,1 vCPU | ~R$ 5 |
| PostgreSQL | 512 MB | 0,2 vCPU | ~R$ 18 |
| Redis | 128 MB | 0,1 vCPU | ~R$ 7 |
| **Subtotal STG** | | | **~R$ 50–60/mês** |

### Referência de preço Railway (2025)

- vCPU: US$ 0,000463/min → ~R$ 0,0026/min
- RAM: US$ 0,000231/GB/min → ~R$ 0,0013/GB/min
- Egress (tráfego saída): US$ 0,10/GB após 100 GB grátis/mês

---

## 3. Backup Seguro do Banco de Dados

### O que o Railway Pro já inclui

| Recurso | Disponibilidade |
|---|---|
| Backup automático diário | ✅ Incluído no Pro |
| Retenção de 7 dias | ✅ Incluído no Pro |
| Restore com 1 clique | ✅ Incluído no Pro |
| Point-in-time recovery | ❌ Não disponível |

### Backup externo adicional (recomendado para dados críticos)

Para proteção além do Railway, exportar o banco diariamente para armazenamento externo:

| Solução | Custo/mês | Observação |
|---|---|---|
| **Cloudflare R2** | ~R$ 0–10 | 10 GB grátis, ~R$ 0,012/GB adicional |
| **AWS S3** | ~R$ 5–15 | Mais robusto, mais caro |
| **Backblaze B2** | ~R$ 3–8 | Mais barato, S3-compatível |

> Script de backup: `pg_dump` agendado via cron no Railway ou GitHub Actions (1x/dia), arquivado comprimido no R2. Retenção de 30 dias custa menos de R$ 5/mês para bancos pequenos (<1 GB).

### Custo total de backup

| Item | Custo/mês |
|---|---|
| Railway Pro backup (incluído) | R$ 0 |
| Cloudflare R2 (backup externo) | ~R$ 5–10 |
| **Total backup** | **~R$ 5–10/mês** |

---

## 4. Custo Total do Cenário (3 usuários · 24/7 · backup)

### Custo nosso (o que pagamos para operar)

| Item | Custo mensal |
|---|---|
| Railway PROD (plano Pro + uso) | ~R$ 135–175 |
| Railway STG (plano Hobby + uso) | ~R$ 55–70 |
| Backup externo (R2/Backblaze) | ~R$ 5–10 |
| Monitoramento uptime (UptimeRobot) | R$ 0 (gratuito) |
| Domínio custom (se necessário) | ~R$ 5 |
| **Total custo operacional/mês** | **~R$ 200–260/mês** |

> Este valor é **fixo independente do cliente** — é o custo da nossa infraestrutura compartilhada. A partir do segundo cliente o custo é rateado.

---

## 5. Quanto Cobrar deste Cliente

### Composição do preço

O preço deve cobrir: **custo operacional + margem de lucro + suporte + desenvolvimento contínuo**.

| Item | Valor |
|---|---|
| Custo operacional (rateado, 1 cliente) | ~R$ 230 |
| Margem para suporte e manutenção | ~R$ 150 |
| Margem de lucro (~55%) | ~R$ 370 |
| **Preço sugerido/mês** | **R$ 750–997** |

### Recomendação: Plano Profissional — R$ 997/mês

Com 3 usuários, 24/7 e backup, o cliente se encaixa no **Plano Profissional**:

| Item | Incluso |
|---|---|
| Usuários (agentes) | até 5 |
| Sessões bot/mês | até 2.000 |
| Disponibilidade | 24/7 com restart automático |
| Backup | Railway Pro (7 dias) + externo (30 dias) |
| Templates HSM | até 3 |
| Monitoramento de uptime | ✅ |
| Suporte | WhatsApp (resposta em 24h úteis) |
| Ambiente de homologação (STG) | ✅ |

### Alternativa — cobrar os custos variáveis separado

Outra abordagem é separar a API do WhatsApp (custo variável por volume):

| Componente | Valor |
|---|---|
| Plataforma (fixo) | R$ 797/mês |
| API WhatsApp (repassado ao cliente) | custo Meta + 20% de taxa |
| Sessões extras (acima de 2.000) | R$ 80 a cada 500 |

Essa estrutura protege você de clientes com volume muito alto.

---

## 6. Retorno por Cliente (divisão 50/50)

### Com 1 cliente Profissional (R$ 997/mês)

| Item | Valor |
|---|---|
| Receita bruta | R$ 997 |
| Custo Railway PROD + STG | − R$ 230 |
| Backup externo | − R$ 8 |
| **Receita líquida** | **R$ 759** |
| Sócio A (50%) | **R$ 379** |
| Sócio B (50%) | **R$ 379** |

### Escala — receita líquida por sócio (50/50)

| Clientes | Plano médio | Receita bruta | Custos infra | Líquido total | **Por sócio** |
|---|---|---|---|---|---|
| 1 | Profissional | R$ 997 | R$ 238 | R$ 759 | **R$ 379** |
| 2 | Profissional | R$ 1.994 | R$ 290 | R$ 1.704 | **R$ 852** |
| 3 | Profissional | R$ 2.991 | R$ 340 | R$ 2.651 | **R$ 1.325** |
| 5 | Profissional | R$ 4.985 | R$ 440 | R$ 4.545 | **R$ 2.272** |
| 10 | Misto | R$ 8.470 | R$ 720 | R$ 7.750 | **R$ 3.875** |
| 20 | Misto | R$ 16.940 | R$ 1.300 | R$ 15.640 | **R$ 7.820** |

> Custos escalam suavemente — Railway comporta múltiplos clientes na mesma instância até ~10 clientes. Acima disso convém avaliar instâncias dedicadas.

---

## 7. Planos Comerciais Completos

### Tabela de planos

| | **Essencial** | **Profissional** | **Enterprise** |
|---|---|---|---|
| **Preço/mês** | **R$ 497** | **R$ 997** | **sob consulta** |
| **Preço/ano** | R$ 4.970 (2 meses grátis) | R$ 9.970 (2 meses grátis) | — |
| Usuários (agentes) | 1 | 5 | ilimitado |
| Sessões bot/mês | até 500 | até 2.000 | ilimitado |
| Disponibilidade | 24/7 | 24/7 | 24/7 + SLA |
| Backup banco | Railway 7 dias | Railway 7 dias + externo 30 dias | externo 90 dias |
| Simulações de financiamento | ✓ | ✓ | ✓ |
| Atendimento humano (takeover) | ✓ | ✓ | ✓ |
| Relatórios e dashboard | básico | completo | personalizado |
| Templates WhatsApp | 1 | 3 | ilimitado |
| Criação de templates | — | ✓ (via painel) | ✓ |
| Monitoramento de uptime | básico | ✓ | ✓ com alertas |
| Suporte | e-mail (48h) | WhatsApp (24h) | dedicado (4h) |
| Ambiente STG incluso | — | ✓ | ✓ |

> **Sessões extras:** R$ 80 a cada 500 sessões acima do plano.

### Taxa de setup (única)

| Serviço | Valor |
|---|---|
| Configuração inicial + integração WhatsApp | R$ 800 |
| Com número já registrado na Meta | R$ 500 |
| Facilitação para perfil verificado (OBA) | R$ 1.200 |
| Backup externo configurado e documentado | R$ 300 |

---

## 8. Custos WhatsApp Business API (Meta Cloud API)

A Meta cobra **por conversa** (janela de 24h), não por mensagem individual.

### Categorias de conversa

| Categoria | Quando ocorre | Custo (Brasil) |
|---|---|---|
| **Service** (atendimento) | Cliente inicia a conversa | Grátis* |
| **Utility** (transacional) | Template pós-24h — reengajamento | ~US$ 0,0200 (~R$ 0,11) |
| **Marketing** | Templates promocionais | ~US$ 0,0625 (~R$ 0,36) |
| **Authentication** | OTP / validação | ~US$ 0,0125 (~R$ 0,07) |

> \* **1.000 conversas de serviço/mês gratuitas** (free tier Meta). Acima disso ~R$ 0,05 por conversa.

### Estimativa por volume

| Volume/mês | Custo Meta |
|---|---|
| até 1.000 conversas | R$ 0 (free tier) |
| 5.000 (service) | ~R$ 200 |
| 5.000 (utility) | ~R$ 550 |
| 10.000 misto | ~R$ 600–1.200 |

---

## 9. Perfil Verificado (Selo Verde ✅)

| Item | Custo |
|---|---|
| Verificação Meta Business (CNPJ + site) | **Gratuito** |
| Selo OBA (Green Badge) | **Gratuito** |
| Consultoria/facilitação (opcional) | R$ 500–2.000 |

> Não é garantido. A Meta aprova por critérios internos. Empresas menores normalmente recebem Business Account (nome visível, sem selo verde).

---

## 10. Break-even e Metas

| Meta | Clientes necessários |
|---|---|
| Cobrir custo fixo de infra (R$ 238/mês) | **1 cliente Profissional** |
| Cada sócio receber R$ 1.000/mês | **~3 clientes Profissional** |
| Cada sócio receber R$ 3.000/mês | **~8 clientes mistos** |
| Cada sócio receber R$ 5.000/mês | **~13 clientes mistos** |
| Cada sócio receber R$ 10.000/mês | **~26 clientes mistos** |

---

## 11. Data Lake — Análise e Custos

Um data lake permitiria armazenar e analisar **todos os eventos brutos** da plataforma: conversas, qualificações do bot, funil de conversão, templates enviados, tempo de resposta dos atendentes — dados que hoje somem quando uma conversa é finalizada ou que ficam presos no PostgreSQL sem consulta analítica eficiente.

### O que um data lake habilitaria

| Capacidade | Valor para o negócio |
|---|---|
| Relatórios históricos ilimitados | Ver funil de conversão de qualquer período |
| Métricas de qualidade de atendimento | Tempo de resposta, taxa de conversão por atendente |
| Análise de comportamento do bot | Onde os leads desistem no fluxo |
| Dashboards por cliente | Cada cliente vê seus próprios dados |
| IA / ML futuro | Treinar modelo próprio de qualificação |
| Auditoria de longo prazo | Histórico de ações além dos logs operacionais |

### Eventos a capturar

```
conversa_iniciada      → timestamp, número, origem
mensagem_recebida      → conversa_id, tipo (texto/áudio/imagem), tamanho
qualificação_bot       → etapa, resposta, timestamp
template_enviado       → template_id, atendente, resultado
takeover_realizado     → conversa_id, atendente_id, timestamp
conversa_finalizada    → duração, atendente, satisfação (futuro)
lead_criado            → dados capturados (sem PII sensível em texto claro)
```

---

### Opções de arquitetura (do mais simples ao mais robusto)

#### Opção A — R2 + DuckDB (recomendado para início)

Exportar eventos do PostgreSQL para Cloudflare R2 em formato Parquet (1x/dia ou em tempo real via job). Consultar com DuckDB via API ou script local.

| Item | Custo/mês |
|---|---|
| Cloudflare R2 (já temos para backup) | ~R$ 0–10 |
| DuckDB | Gratuito (roda em processo Node/Python) |
| Job de exportação (Railway Cron) | Incluso no plano atual |
| **Total adicional** | **~R$ 0–10/mês** |

> Ideal para 1–10 clientes. Consultas em segundos para datasets até ~50 GB. Sem servidor extra.

---

#### Opção B — ClickHouse Cloud (melhor custo-benefício analítico)

Banco OLAP especializado em séries temporais e eventos. Aceita bilhões de linhas, consultas em milissegundos. Tem tier gratuito generoso.

| Item | Custo/mês |
|---|---|
| ClickHouse Cloud (free tier: 1M linhas/consulta) | R$ 0 |
| ClickHouse Cloud (produção ~25 GB) | ~US$ 25 (~R$ 142) |
| Pipeline de ingestão (Kafka ou job simples) | Incluso ou Railway Cron |
| **Total adicional** | **R$ 0 (free) ou ~R$ 142/mês** |

> Recomendado quando tiver 5+ clientes e precisar de dashboards em tempo real.

---

#### Opção C — BigQuery (Google Cloud)

Serverless, paga por consulta. Ideal se já usar Google Cloud para algo.

| Item | Custo/mês |
|---|---|
| Storage (~10 GB) | ~US$ 0,20 (~R$ 1,14) |
| Consultas (primeiros 1 TB/mês grátis) | R$ 0 |
| Streaming insert (se tempo real) | ~US$ 0,01 por 200 MB |
| **Total adicional** | **~R$ 0–30/mês** |

> Boa opção se quiser integrar com Looker Studio (dashboards gratuitos do Google).

---

### Comparativo de opções

| | **Opção A (R2 + DuckDB)** | **Opção B (ClickHouse)** | **Opção C (BigQuery)** |
|---|---|---|---|
| Custo/mês | R$ 0–10 | R$ 0–142 | R$ 0–30 |
| Complexidade de setup | Baixa | Média | Média |
| Latência de consulta | Segundos | Milissegundos | Segundos |
| Tempo real | ❌ | ✅ | Parcial |
| Dashboard nativo | ❌ (precisa exportar) | ✅ | ✅ (Looker Studio) |
| Escala até | ~50 GB / 10 clientes | Bilhões de linhas | Ilimitado |
| Recomendado para | Início / MVP analytics | 5+ clientes | Integração Google |

---

### Impacto no custo total por cenário

| Cenário | Sem data lake | + Opção A | + Opção B |
|---|---|---|---|
| 1 cliente | R$ 200–260/mês | R$ 200–270/mês | R$ 342–402/mês |
| 5 clientes | R$ 440/mês | R$ 450/mês | R$ 582/mês |
| 10 clientes | R$ 720/mês | R$ 730/mês | R$ 862/mês |

> O custo do data lake é diluído conforme escala — com 5+ clientes o impacto por cliente é de R$ 2–28/mês.

---

### Recomendação

**Fase 1 (agora — até 5 clientes):** implementar Opção A com R2. Custo zero extra, habilita relatórios históricos básicos. Pipeline: job diário que exporta tabelas do PostgreSQL para R2 em Parquet.

**Fase 2 (5+ clientes):** migrar para ClickHouse Cloud (free tier cobre bem os primeiros meses). Adicionar dashboard ao painel do cliente como diferencial de plano.

**Fase 3 (Enterprise):** BigQuery + Looker Studio para clientes que precisam de BI avançado. Cobrar como add-on (R$ 200–500/mês por cliente).

---

## 12. Fontes de referência

- Railway pricing: https://railway.com/pricing
- Meta WhatsApp pricing (Brasil): https://developers.facebook.com/docs/whatsapp/pricing
- Cloudflare R2: https://developers.cloudflare.com/r2/pricing/
- Backblaze B2: https://www.backblaze.com/b2/cloud-storage-pricing.html
- ClickHouse Cloud pricing: https://clickhouse.com/pricing
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- DuckDB: https://duckdb.org/
