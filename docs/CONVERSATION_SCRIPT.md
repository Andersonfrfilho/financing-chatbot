# Roteiro Conversacional — WhatsApp Bot

Cada seção define os campos, validações, dependências e mensagem exibida ao usuário.
Estados de sessão são salvos em Redis com chave `session:{whatsapp_number}`.

---

## 1. Saudação Inicial

**Trigger:** qualquer mensagem em sessão nova ou expirada

```
Olá! 👋 Bem-vindo à simulação de crédito.
Vou te ajudar a encontrar as melhores condições. Vamos começar!

Para qual finalidade você deseja simular?

1️⃣  Imóvel
2️⃣  Veículo
3️⃣  Crédito Pessoal
4️⃣  Consignado
5️⃣  Empresa / PJ
6️⃣  Equipamento
7️⃣  Rural / Agrícola
```

**Aceita:** número (1–7), palavras ("casa", "carro", "moto", "pessoal")
**Próximo estado:** `awaiting_person_type`

---

## 2. Dados Cadastrais — comuns a todos os fluxos

### 2.1 Tipo de Pessoa

| Campo | `personType` |
|-------|-------------|
| Tipo | `enum` |
| Valores | `pf` \| `pj` |
| Obrigatório | sim |

```
Você é pessoa física ou jurídica?

1️⃣  Pessoa Física (CPF)
2️⃣  Pessoa Jurídica (CNPJ)
```

---

### 2.2 Pessoa Física (PF)

Coletado em sequência, um campo por mensagem:

| Ordem | Campo | Mensagem ao usuário | Validação |
|-------|-------|---------------------|-----------|
| 1 | `name` | "Qual é o seu nome completo?" | mín. 2 palavras |
| 2 | `cpf` | "Qual é o número do seu CPF?" | 11 dígitos, dígito verificador |
| 3 | `birthDate` | "Quando você nasceu? (dd/mm/aaaa)" | data válida, idade ≥ 18 |
| 4 | `email` | "Qual o e-mail de sua preferência?" | formato válido |
| 5 | `phone` | "Qual o seu celular? (com DDD)" | 10 ou 11 dígitos |
| 6 | `monthlyIncome` | "Qual a sua renda mensal? (R$)" | número > 0 |
| 7 | `hasCoParticipant` | "Deseja incluir a renda de outro participante? (sim/não)" | booleano |
| 8 *(se sim)* | `coParticipantIncome` | "Qual a renda do outro participante? (R$)" | número > 0 |

---

### 2.3 Pessoa Jurídica (PJ)

| Ordem | Campo | Mensagem ao usuário | Validação |
|-------|-------|---------------------|-----------|
| 1 | `companyName` | "Qual o nome da empresa?" | mín. 2 chars |
| 2 | `cnpj` | "Qual o CNPJ da empresa?" | 14 dígitos, dígito verificador |
| 3 | `responsibleName` | "Qual o nome do responsável?" | mín. 2 palavras |
| 4 | `email` | "Qual o e-mail de contato?" | formato válido |
| 5 | `phone` | "Qual o celular do responsável? (com DDD)" | 10 ou 11 dígitos |
| 6 | `companyRevenue` | "Qual o faturamento mensal da empresa? (R$)" | número > 0 |

---

## 3. Fluxo — Veículo

**Entra aqui após:** dados cadastrais coletados

### 3.1 Intenção de compra

```
Você está apenas pesquisando ou já vai comprar?

1️⃣  Apenas pesquisando
2️⃣  Já vou comprar
```

| Campo | `purchaseIntent` | `researching` \| `buying` |

---

### 3.2 Contexto do vendedor

```
Como pretende adquirir o veículo?

1️⃣  Loja / revendedora
2️⃣  Concessionária
3️⃣  Direto com o dono (particular)
```

| Campo | `sellerContext` | `dealer` \| `dealership` \| `private` |

---

### 3.3 Tipo de veículo

```
Carro ou moto?

1️⃣  Carro
2️⃣  Moto
```

| Campo | `vehicleType` | `car` \| `motorcycle` |

---

### 3.4 CNH

```
Você possui CNH? (obrigatório para financiamento)

1️⃣  Sim
2️⃣  Não
```

| Campo | `hasCnh` | booleano |

> ⚠️ Se `hasCnh = false`: exibir aviso e encerrar o fluxo de veículo.

---

### 3.5 Detalhes do veículo

Coletado em sequência — cada resposta depende da anterior:

| Ordem | Campo | Mensagem ao usuário | Dependência | Validação |
|-------|-------|---------------------|-------------|-----------|
| 1 | `vehicleBrand` | "Qual a marca do veículo?" | — | texto livre ou lista |
| 2 | `vehicleYear` | "Qual o ano do veículo?" | após marca | 4 dígitos, ≥ ano atual - 20 |
| 3 | `vehicleFuel` | "Qual o combustível?\n1️⃣ Flex\n2️⃣ Gasolina\n3️⃣ Diesel\n4️⃣ Elétrico\n5️⃣ Híbrido" | após ano | enum |
| 4 | `vehicleModel` | "Qual o modelo?" | após marca + ano | texto livre |
| 5 | `residenceState` | "Qual o seu estado de residência? (UF)" | — | 2 letras, UF válida |
| 6 | `vehicleValue` | "Qual o valor do veículo? (R$)" | — | número > 0 |
| 7 | `downPaymentAmount` | "Qual o valor de entrada? (R$ ou 0 para sem entrada)" | — | ≥ 0 e < vehicleValue |
| 8 | `termMonths` | "Qual o prazo?\n1️⃣ 24m\n2️⃣ 36m\n3️⃣ 48m\n4️⃣ 60m\n5️⃣ Digitar outro" | — | 12–84 meses |

---

## 4. Fluxo — Imóvel

**Entra aqui após:** dados cadastrais coletados

### 4.1 Objetivo

```
Qual o seu objetivo?

1️⃣  Financiamento de Imóvel
2️⃣  Crédito com Garantia de Imóvel (home equity)
3️⃣  Portabilidade de financiamento
```

| Campo | `realEstateObjective` | `financing` \| `home_equity` \| `portability` |

---

### 4.2 Tipo do imóvel

```
Qual o tipo do imóvel?

1️⃣  Residencial
2️⃣  Comercial
```

| Campo | `propertyType` | `residential` \| `commercial` |

---

### 4.3 Prazo de aquisição

```
Quando você pretende adquirir o imóvel?

1️⃣  Imediatamente
2️⃣  Até 3 meses
3️⃣  3 a 6 meses
4️⃣  6 a 12 meses
5️⃣  Apenas pesquisando
```

| Campo | `purchaseTimeline` | `immediate` \| `3m` \| `6m` \| `12m` \| `researching` |

---

### 4.4 Dados do imóvel

| Ordem | Campo | Mensagem ao usuário | Dependência | Validação |
|-------|-------|---------------------|-------------|-----------|
| 1 | `propertyState` | "Qual o estado do imóvel? (UF)" | — | UF válida |
| 2 | `propertyCity` | "Qual a cidade do imóvel?" | após estado | texto |
| 3 | `propertyValue` | "Qual o valor do imóvel? (R$)" | — | > 0 |
| 4 | `financingAmount` | "Qual o valor a financiar? (R$)" | ≤ propertyValue | > 0 |
| 5 | `termYears` | "Qual o prazo em anos? (máx. 35)" | — | 1–35 |
| 6 | `includeFees` | "Deseja financiar ITBI e Registro? (~5% do valor)\n1️⃣ Sim\n2️⃣ Não" | — | booleano |
| 7 | `fgtsAmount` | "Possui FGTS? Qual o valor? (R$ ou 0)" | — | ≥ 0 |

> ℹ️ Se `realEstateObjective = portability`: pular campos 3, 4 e 6. Perguntar apenas saldo devedor atual e banco atual.

---

## 5. Fluxo — Crédito Pessoal / Consignado

| Ordem | Campo | Mensagem ao usuário | Validação |
|-------|-------|---------------------|-----------|
| 1 | `loanAmount` | "Qual o valor que precisa? (R$)" | > 0 |
| 2 | `employmentType` | "Qual sua situação profissional?\n1️⃣ CLT\n2️⃣ Servidor público\n3️⃣ Autônomo\n4️⃣ Empresário\n5️⃣ Aposentado/Pensionista" | enum |
| 3 *(CLT)* | `employer` | "Nome da empresa onde trabalha?" | texto |
| 3 *(Empresário)* | `companyCnpj` | "CNPJ da sua empresa?" | 14 dígitos |
| 4 | `termMonths` | "Qual o prazo?\n1️⃣ 12m\n2️⃣ 24m\n3️⃣ 36m\n4️⃣ 48m\n5️⃣ 60m\n6️⃣ Digitar outro" | 6–120 meses |

---

## 6. Encerramento — pós-simulação

```
✅ Simulação pronta! Aqui estão as melhores condições encontradas:

🏦 [Banco X] — Parcela: R$ 1.850 | Taxa: 10,5% a.a. | Sistema: SAC
🏦 [Banco Y] — Parcela: R$ 1.920 | Taxa: 10,9% a.a. | Sistema: PRICE

O que deseja fazer?

1️⃣  Falar com um consultor
2️⃣  Refazer a simulação
3️⃣  Encerrar
```

**Se opção 1:**
- Salva como lead no banco (`POST /api/leads`)
- Notifica consultor via n8n

---

## 7. Comandos globais (qualquer estado)

| Palavra | Ação |
|---------|------|
| `cancelar` / `sair` | Encerra sessão → estado `abandoned` |
| `recomeçar` / `novo` | Limpa contexto → volta ao início |
| `ajuda` / `help` | Exibe menu de comandos |
| `oi` / `olá` / `bom dia` | Retoma sessão ativa ou inicia nova |

---

## 8. Dependências entre campos — resumo

```
personType
  └── pf  → name → cpf → birthDate → email → phone → monthlyIncome → hasCoParticipant
  └── pj  → companyName → cnpj → responsibleName → email → phone → companyRevenue

financingType
  └── veiculo
        └── purchaseIntent → sellerContext → vehicleType → hasCnh*
              └── vehicleBrand → vehicleYear → vehicleFuel → vehicleModel
                    └── residenceState → vehicleValue → downPaymentAmount → termMonths
  └── imobiliario
        └── realEstateObjective → propertyType → purchaseTimeline
              └── propertyState → propertyCity → propertyValue → financingAmount
                    └── termYears → includeFees → fgtsAmount
  └── pessoal/consignado
        └── loanAmount → employmentType* → termMonths

* hasCnh=false encerra o fluxo de veículo
* employmentType define campos adicionais (employer ou companyCnpj)
```

---

## 9. Estados da sessão Redis

| Estado | Descrição |
|--------|-----------|
| `greeting` | Sessão iniciada, aguardando tipo |
| `awaiting_person_type` | PF ou PJ? |
| `collecting_personal_data` | Dados cadastrais em andamento |
| `collecting_vehicle_data` | Dados de veículo em andamento |
| `collecting_real_estate_data` | Dados de imóvel em andamento |
| `collecting_loan_data` | Dados de crédito pessoal em andamento |
| `simulation_ready` | Simulação exibida, aguardando decisão |
| `lead_captured` | Cliente pediu consultor |
| `completed` | Fluxo encerrado normalmente |
| `abandoned` | Cliente cancelou |

Chave Redis: `session:{whatsapp_number}` — TTL: 24h
Chave de contexto: `session:{whatsapp_number}:context` — TTL: 24h
