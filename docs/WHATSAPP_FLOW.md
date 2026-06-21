# Fluxo Conversacional WhatsApp

## Diagrama de Estados

```
new / greeting
    ↓
awaiting_financing_type
    ↓
awaiting_name → awaiting_cpf → awaiting_birth_date → awaiting_civil_status → awaiting_email → awaiting_city → awaiting_state
    ↓
awaiting_monthly_income → awaiting_family_income
    ↓ (por modalidade)
    ├── imobiliario → awaiting_fgts → [awaiting_fgts_amount] → awaiting_down_payment → [awaiting_down_payment_amount] → awaiting_property_value → awaiting_property_type → awaiting_property_city → awaiting_property_state
    ├── veiculo → awaiting_vehicle_type → awaiting_vehicle_value → awaiting_vehicle_year → awaiting_vehicle_down_payment → [awaiting_vehicle_down_payment_amount]
    └── pessoal/consignado/empresa/equipamento/rural → awaiting_loan_amount → awaiting_employment_type → [awaiting_employer | awaiting_cnpj → awaiting_company_revenue]
    ↓
awaiting_term
    ↓
simulation_ready ←── (API dispara simulação)
    ↓
human_handoff | completed
```

## Comandos Globais

| Comando | Efeito |
|---------|--------|
| `cancelar`, `cancel`, `sair` | → `abandoned` |
| `recomeçar`, `restart`, `novo` | → `awaiting_financing_type` + limpa contexto |
| `oi`, `olá`, `bom dia`, etc. | Retoma sessão ou inicia nova |

## Seleção de Modalidade

```
1️⃣ Imóvel
2️⃣ Veículo
3️⃣ Crédito Pessoal
4️⃣ Consignado
5️⃣ Empresa/PJ
6️⃣ Equipamento
7️⃣ Rural/Agrícola
```

Aceita: número (1-7), nome em português, sinônimos (ex: "casa", "carro", "moto").

## Atalhos de Prazo

```
1 = 12 meses
2 = 24 meses
3 = 36 meses
4 = 48 meses
5 = 60 meses
[6-420] = número direto
```

## Persistência de Sessão

Sessões são armazenadas em `conversation_sessions` com:
- `whatsapp_number` — identificador único
- `current_state` — estado atual do fluxo
- `context` — JSONB com todos os dados coletados
- `last_activity` — timestamp da última mensagem

## Estrutura do Contexto (JSONB)

```typescript
{
  // Dados pessoais
  name: string
  cpf: string (sem formatação)
  birthDate: string (DD/MM/AAAA)
  civilStatus: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel'
  email: string
  city: string
  state: string (UF)
  
  // Dados financeiros
  financingType: 'imobiliario' | 'veiculo' | 'pessoal' | 'consignado' | 'empresa' | 'equipamento' | 'rural'
  monthlyIncome: number
  familyIncome: number
  
  // Imobiliário
  fgtsAmount?: number
  downPaymentAmount?: number
  propertyValue?: number
  propertyType?: 'residencial' | 'comercial' | 'terreno' | 'rural'
  propertyCity?: string
  propertyState?: string
  
  // Veículo
  vehicleType?: 'carro' | 'moto' | 'caminhao' | 'outro'
  vehicleValue?: number
  vehicleYear?: number
  
  // Empréstimos
  loanAmount?: number
  employmentType?: 'clt' | 'servidor_publico' | 'autonomo' | 'empresario' | 'aposentado'
  employer?: string
  cnpj?: string
  companyRevenue?: number
  
  // Prazo + simulação
  termMonths?: number
  requestedAmount?: number
  simulationId?: string
}
```

## Integração n8n → API

Quando `triggerSimulation: true` no retorno do handler:

1. n8n chama `POST /api/simulations` com `simulationPayload`
2. API calcula SAC + PRICE para todos os bancos ativos
3. API retorna resultados ordenados por menor primeira parcela
4. n8n formata e envia mensagem com os resultados via WhatsApp Cloud API
5. Estado muda para `simulation_ready`
6. Bot oferece handoff para consultor (opção 1) ou encerramento (opção 2)
