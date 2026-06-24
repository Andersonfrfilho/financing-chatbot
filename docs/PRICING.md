# Precificação e Custos — Financiamento Bot

> Referência para definir planos comerciais e entender o custo operacional da plataforma.  
> Valores em BRL (conversão aproximada USD → BRL a R$ 5,70). Atualizar conforme câmbio.  
> **Premissa:** dois ambientes ativos (Staging + Produção) e divisão de 50% da receita líquida entre os sócios.

---

## 1. Custos de Infraestrutura — Railway

O projeto roda com 4 serviços por ambiente: **API**, **Web (Nginx)**, **PostgreSQL** e **Redis**.  
São **dois ambientes permanentes**: Staging (STG) e Produção (PROD).

### Planos Railway necessários

| Ambiente | Plano Railway | Custo base/mês |
|---|---|---|
| **Produção (PROD)** | Pro | US$ 20 (~R$ 114) |
| **Staging (STG)** | Hobby | US$ 5 (~R$ 28) |
| **Total base** | | **~R$ 142/mês** |

### Estimativa de consumo por ambiente

#### Produção

| Serviço | RAM | vCPU | Estimativa/mês |
|---|---|---|---|
| API (Node/Bun) | 512 MB | 0,5 vCPU | ~R$ 55 |
| Web (Nginx static) | 128 MB | 0,1 vCPU | ~R$ 10 |
| PostgreSQL | 1 GB | 0,5 vCPU | ~R$ 40 |
| Redis | 256 MB | 0,1 vCPU | ~R$ 15 |
| **Subtotal PROD** | | | **~R$ 120–160/mês** |

#### Staging (ambiente reduzido)

| Serviço | RAM | vCPU | Estimativa/mês |
|---|---|---|---|
| API | 256 MB | 0,2 vCPU | ~R$ 20 |
| Web | 128 MB | 0,1 vCPU | ~R$ 5 |
| PostgreSQL | 512 MB | 0,2 vCPU | ~R$ 18 |
| Redis | 128 MB | 0,1 vCPU | ~R$ 7 |
| **Subtotal STG** | | | **~R$ 50–60/mês** |

### Total Railway (PROD + STG)

| | Mínimo | Máximo |
|---|---|---|
| Custo base (planos) | R$ 142 | R$ 142 |
| Uso estimado | R$ 170 | R$ 220 |
| **Total Railway/mês** | **~R$ 180** | **~R$ 250** |

> STG roda com recursos menores e pode ser pausado nos fins de semana se necessário, reduzindo ~R$ 20/mês.

### Referência de preço Railway (2025)

- vCPU: US$ 0,000463/min → ~R$ 0,0026/min
- RAM: US$ 0,000231/GB/min → ~R$ 0,0013/GB/min
- Egress: US$ 0,10/GB após 100 GB grátis/mês

---

## 2. Custos WhatsApp Business API (Meta Cloud API)

A Meta cobra **por conversa** (janela de 24h), não por mensagem individual.

### Categorias de conversa

| Categoria | Quando ocorre | Custo estimado (Brasil) |
|---|---|---|
| **Service** (atendimento) | Cliente inicia a conversa | Grátis* |
| **Utility** (transacional) | Template pós-24h — reengajamento | ~US$ 0,0200 (~R$ 0,11) |
| **Marketing** | Templates promocionais | ~US$ 0,0625 (~R$ 0,36) |
| **Authentication** | OTP / validação | ~US$ 0,0125 (~R$ 0,07) |

> \* **1.000 conversas de serviço por mês são gratuitas** (free tier Meta). Acima disso ~US$ 0,008 (~R$ 0,05) por conversa.

### Estimativa por volume mensal

| Volume de conversas/mês | Custo Meta estimado |
|---|---|
| até 1.000 (service) | R$ 0 (free tier) |
| 5.000 (service) | ~R$ 200 |
| 5.000 (utility/reengajamento) | ~R$ 550 |
| 10.000 misto | ~R$ 600–1.200 |

> O custo da API WhatsApp é repassado ao cliente ou absorvido dependendo do plano contratado.

### Número WhatsApp Business

- **Número próprio do cliente** (recomendado): gratuito — cliente registra no Meta Business Manager.
- **Via BSP** (Twilio, Zenvia, etc.): R$ 150–500/mês — não recomendado para começar.

---

## 3. Perfil Verificado (Selo Verde ✅)

O **Official Business Account (OBA)** exibe o nome da empresa com selo verde no WhatsApp.

### Requisitos

1. Meta Business Manager com verificação de CNPJ + site da empresa concluída.
2. Volume de conversas relevante e histórico consistente.
3. Solicitação via **WhatsApp Manager → Phone numbers → Request official business account**.

### Custos

| Item | Custo |
|---|---|
| Verificação Meta Business | **Gratuito** |
| Selo OBA (Green Badge) | **Gratuito** |
| Consultoria/facilitação (opcional) | R$ 500–2.000 |

> O selo não é garantido — a Meta aprova conforme critérios internos. Empresas menores normalmente recebem **Business Account** (nome da empresa exibido, sem selo verde).

---

## 4. Planos Comerciais

### Custo operacional base (fixo, independente do número de clientes)

| Item | Custo mensal |
|---|---|
| Railway PROD + STG | R$ 180–250 |
| API WhatsApp (volume baixo) | R$ 0–100 |
| Domínios / certificados | ~R$ 10 |
| **Custo fixo base** | **~R$ 190–360/mês** |

> A partir do segundo cliente, o custo fixo de infra é rateado — Railway comporta múltiplos clientes na mesma instância até certo volume.

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
| Ambiente STG incluso | — | ✓ | ✓ |

> **Sessões extras:** R$ 80 a cada 500 sessões acima do plano.

### Taxa de setup (única, não dividida — cobre custo de implantação)

| Serviço | Valor |
|---|---|
| Configuração inicial + integração WhatsApp | R$ 800 |
| Com número do cliente já registrado na Meta | R$ 500 |
| Facilitação para perfil verificado (OBA) | R$ 1.200 |

---

## 5. Distribuição de Receita (Sociedade 50/50)

A receita líquida após custos operacionais é dividida igualmente entre os sócios.

### Exemplo com 1 cliente — Plano Essencial (R$ 497/mês)

| Item | Valor |
|---|---|
| Receita bruta | R$ 497 |
| Custo Railway (rateado) | − R$ 120 |
| Custo WhatsApp API (estimado) | − R$ 30 |
| **Receita líquida** | **R$ 347** |
| Sócio A (50%) | R$ 173 |
| Sócio B (50%) | R$ 173 |

### Escala — receita líquida por sócio

| Clientes | Plano médio | Receita bruta | Custos | Líquido total | **Por sócio (50%)** |
|---|---|---|---|---|---|
| 1 | Essencial | R$ 497 | R$ 230 | R$ 267 | **R$ 133** |
| 3 | Essencial | R$ 1.491 | R$ 420 | R$ 1.071 | **R$ 535** |
| 5 | Profissional | R$ 4.985 | R$ 700 | R$ 4.285 | **R$ 2.142** |
| 10 | Misto | R$ 7.470 | R$ 1.100 | R$ 6.370 | **R$ 3.185** |
| 20 | Misto | R$ 14.940 | R$ 1.800 | R$ 13.140 | **R$ 6.570** |

> Custos escalam suavemente pois a infra Railway é compartilhada. A partir de ~10 clientes convém avaliar instâncias dedicadas por cliente (Enterprise).

### Setup fee — distribuição

O setup fee é receita de serviço pontual. Sugestão: **70% vai para quem executou a implantação**, 30% dividido igualmente — ou dividir 50/50 se ambos participaram.

---

## 6. Break-even

| Cenário | Clientes necessários |
|---|---|
| Cobrir custo fixo Railway (R$ 220/mês) | **1 cliente Essencial** |
| Cada sócio receber R$ 1.000/mês líquido | **~4 clientes Profissional** |
| Cada sócio receber R$ 3.000/mês líquido | **~9 clientes mistos** |
| Cada sócio receber R$ 5.000/mês líquido | **~14 clientes mistos** |

---

## 7. Fontes de referência

- Railway pricing: https://railway.com/pricing
- Meta WhatsApp pricing (Brasil): https://developers.facebook.com/docs/whatsapp/pricing
- WhatsApp Business Platform: https://business.whatsapp.com/products/platform-pricing
