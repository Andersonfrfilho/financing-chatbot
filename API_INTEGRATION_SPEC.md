# API Integration Spec - Open Finance Brasil
**Spec-Driven Development Document**  
**Date:** June 21, 2026  
**Status:** In Development

---

## 1. Executive Summary

Integração com APIs reais do Banco Central do Brasil (BCB) para substituir fallback rates hardcoded por dados públicos e atualizados sobre:
- **Taxas de juros** por modalidade e instituição (OLINDA API)
- **Indicadores de crédito** (Inadimplência, spread, volume) (SGS API)
- **Taxas de referência** (Selic, CDI) (SGS API)

**Benefícios:**
- ✅ Dados reais e públicos do governo brasileiro
- ✅ Sem necessidade de OAuth (acesso aberto)
- ✅ Integração com Open Banking Brasil oficial
- ✅ Simulações mais realistas e confiáveis

---

## 2. Requirements

### 2.1 Functional Requirements

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-1 | Buscar taxas de juros por banco, modalidade e data | HIGH | ❌ |
| FR-2 | Mapear modalidades internas → modalidades BCB | HIGH | ❌ |
| FR-3 | Validar e fazer cache de taxas | HIGH | ❌ |
| FR-4 | Fallback para fallback rates se API falhar | MEDIUM | ⚠️ |
| FR-5 | Buscar Selic/CDI como referência | MEDIUM | ❌ |
| FR-6 | Cruzar taxas com dados de inadimplência | LOW | ❌ |
| FR-7 | Logging detalhado de chamadas de API | HIGH | ⚠️ |

### 2.2 Non-Functional Requirements

| NFR | Specification | Target |
|---|---|---|
| **Performance** | Taxa de resposta da API | < 2s |
| **Availability** | Uptime esperado | 99.9% |
| **Cache** | TTL para taxas | 24h (não mudam diariamente) |
| **Rate Limit** | Chamadas por segundo | ≤ 5 req/s |
| **Timeout** | Tempo máximo de espera | 8s |
| **Fallback** | Usar rates locais se BCB indisponível | ✅ Automático |

---

## 3. Data Validity & Disclaimer

### ⚠️ CRITICAL: Rate Validity & Temporal Constraints

**Rates are NOT real-time and CHANGE frequently:**

| Factor | Impact | Action |
|--------|--------|--------|
| **Time Delay** | OLINDA has 5-10 business days delay | Add timestamp to rate |
| **Market Changes** | Rates change daily or hourly | Cache max 24h |
| **User Inquiry Time** | Rates change during simulation | Warn user in UI |
| **Rate Confirmation** | Bank confirms rate at proposal time | Document rate as indicative |
| **Legal Disclaimer** | Rates are NOT legally binding | Add user consent checkbox |

**Implementation Requirements:**

1. **Every rate must include:**
   ```typescript
   {
     rate: number;
     effectiveDate: string;  // When rate was fetched
     queryDate: string;      // When user queried
     validity_hours: 24;     // How long rate is valid
     disclaimer: 'Indicativa - Sujeita a alteração'
   }
   ```

2. **User-facing message:**
   ```
   "⚠️ Estas taxas são indicativas e consultadas em {date} às {time}. 
    Podem sofrer alterações no momento da contratação. 
    Confirme a taxa com o banco antes de formalizar."
   ```

3. **Timestamp tracking in database:**
   ```sql
   ALTER TABLE bank_rates ADD COLUMN query_timestamp TIMESTAMP DEFAULT NOW();
   ALTER TABLE financing_simulations ADD COLUMN rate_query_timestamp TIMESTAMP;
   ```

4. **Cache invalidation:**
   ```typescript
   // Rates expire after 24h OR end of business day (5pm)
   // Whichever comes first
   const CACHE_TTL = Math.min(
     24 * 60 * 60, // 24 hours
     msUntilEndOfBusinessDay() // 5pm
   );
   ```

---

## 3. API Specifications

### 3.1 Banco Central - OLINDA (Taxas de Juros)

#### 3.1.1 Endpoint Details

```
Service: Banco Central do Brasil (BCB)
API: OLINDA v2
Resource: TaxasJurosDiariaPorInicio
Base URL: https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata
Authentication: None (public)
Rate Limit: ~5 req/s (not official)
Response Format: JSON (OData)
Update Frequency: Daily (with 5 business days delay)
```

#### 3.1.2 Request Specification

**Path:** `/TaxasJurosDiariaPorInicio(InicioPeriodo=@InicioPeriodo)`

**Query Parameters:**

```typescript
interface OlindaJurosRequest {
  '@InicioPeriodo': string;        // ISO date: '2026-06-21'
  '$filter': string;                // OData filter expression
  '$select'?: string;               // Fields to return (comma-separated)
  '$top'?: number;                  // Max results (default: 10000)
  '$skip'?: number;                 // Offset for pagination
  '$orderby'?: string;              // Sort order
  '$format': 'json' | 'xml';        // Response format
}
```

**Filter Examples:**

```typescript
// All rates for a specific bank
'InstituicaoFinanceira eq \'BANCO DO BRASIL\' and Segmento eq \'PESSOA FÍSICA\''

// CDC (Crédito Pessoal) rates
'Modalidade eq \'CRÉDITO PESSOAL\' and Segmento eq \'PESSOA FÍSICA\''

// Vehicle financing
'Modalidade eq \'FINANCIAMENTO DE VEÍCULOS\' and Segmento eq \'PESSOA FÍSICA\''

// Leasing
'Modalidade eq \'LEASING\' and Segmento eq \'PESSOA FÍSICA\''
```

#### 3.1.3 Response Specification

```typescript
interface OlindaResponse {
  '@odata.context': string;
  '@odata.type': string;
  value: OlindaTaxaJuros[];
}

interface OlindaTaxaJuros {
  'Segmento': 'PESSOA FÍSICA' | 'PESSOA JURÍDICA';
  'Modalidade': string;  // CDC, Financiamento de Veículos, etc
  'InstituicaoFinanceira': string;  // Banco name
  'TaxaJurosAoMes': number;   // % per month
  'TaxaJurosAoAno': number;   // % per year (annualized)
  'cnpj8': string;            // 8-digit CNPJ
  'Posicao': number;          // Ranking in modality
  'InicioPeriodo': string;    // ISO date
  'FimPeriodo': string;       // ISO date
}
```

**Example Response:**

```json
{
  "@odata.context": "https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/$metadata#TaxasJurosDiarias",
  "value": [
    {
      "Segmento": "PESSOA FÍSICA",
      "Modalidade": "CRÉDITO PESSOAL",
      "InstituicaoFinanceira": "BANCO DO BRASIL S/A",
      "TaxaJurosAoMes": 3.29,
      "TaxaJurosAoAno": 47.82,
      "cnpj8": "00000000",
      "Posicao": 1,
      "InicioPeriodo": "2026-06-01",
      "FimPeriodo": "2026-06-21"
    }
  ]
}
```

---

### 3.2 Banco Central - SGS API (Juros de Referência)

#### 3.2.1 Endpoint Details

```
Service: Banco Central do Brasil (BCB)
API: SGS (Sistema de Gerenciamento de Séries)
Base URL: https://api.bcb.gov.br/dados/serie/bcdata.sgs
Authentication: None (public)
Rate Limit: ~5 req/s (not official)
Response Format: JSON, CSV, XML
Update Frequency: Daily (series 11, 12) / Monthly (series 20714, 20715)
```

#### 3.2.2 Request Specification

**Path:** `/{SERIE_ID}/dados`

```typescript
interface SGSRequest {
  formato: 'json' | 'csv' | 'xml';
  dataInicial?: string;  // dd/MM/yyyy
  dataFinal?: string;    // dd/MM/yyyy
}
```

**Series IDs:**

| Serie ID | Descrição | Unidade | Frequência |
|----------|-----------|---------|-----------|
| **432** | Taxa Selic (meta) | % a.a. | Diária |
| **11** | Taxa Selic (diária) | % a.a. | Diária |
| **12** | CDI | % a.a. | Diária |
| **20714** | Taxa média juros - Empréstimos PF | % a.a. | Mensal |
| **20715** | Taxa média juros - Empréstimos PJ | % a.a. | Mensal |
| **20786** | Spread médio - PF | p.p. | Mensal |
| **20787** | Spread médio - PJ | p.p. | Mensal |
| **21112** | Inadimplência - Recursos livres PF | % | Mensal |
| **21113** | Inadimplência - Recursos livres PJ | % | Mensal |

#### 3.2.3 Response Specification

```typescript
interface SGSResponse {
  data: string;    // dd/MM/yyyy
  valor: string;   // Numeric string (e.g., "10.5")
}[]
```

**Example Request:**

```bash
GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json
```

**Example Response:**

```json
[
  {
    "data": "21/06/2026",
    "valor": "10.50"
  },
  {
    "data": "20/06/2026",
    "valor": "10.50"
  }
]
```

---

## 4. Data Mapping

### 4.1 Internal Modalities → BCB Modalities

```typescript
interface ModalityMapping {
  internal: FinancingModality;
  bcbNames: string[];  // Possible BCB names
  segment: 'PESSOA FÍSICA' | 'PESSOA JURÍDICA';
  description: string;
}

const MODALITY_MAPPING: Record<FinancingModality, ModalityMapping> = {
  // Vehicle financing
  CDC: {
    internal: 'CDC',
    bcbNames: ['CRÉDITO PESSOAL', 'EMPRÉSTIMO PESSOAL'],
    segment: 'PESSOA FÍSICA',
    description: 'Consumer Directed Credit / Personal Loan'
  },
  
  LEASING: {
    internal: 'LEASING',
    bcbNames: ['LEASING', 'ARRENDAMENTO MERCANTIL'],
    segment: 'PESSOA FÍSICA',
    description: 'Vehicle leasing'
  },

  // Real estate financing
  SFH: {
    internal: 'SFH',
    bcbNames: ['FINANCIAMENTO IMOBILIÁRIO', 'FINANCIAMENTO - SFH'],
    segment: 'PESSOA FÍSICA',
    description: 'Real Estate Financing (SFH - Sistema Financeiro da Habitação)'
  },
  
  SFI: {
    internal: 'SFI',
    bcbNames: ['FINANCIAMENTO IMOBILIÁRIO', 'FINANCIAMENTO - SFI'],
    segment: 'PESSOA FÍSICA',
    description: 'Real Estate Financing (SFI - Sistema de Financiamento Imobiliário)'
  },

  FGTS: {
    internal: 'FGTS',
    bcbNames: ['FGTS', 'FINANCIAMENTO COM FGTS'],
    segment: 'PESSOA FÍSICA',
    description: 'Real Estate with FGTS (Fundo de Garantia do Tempo de Serviço)'
  },

  MCMV: {
    internal: 'MCMV',
    bcbNames: ['MINHA CASA MINHA VIDA'],
    segment: 'PESSOA FÍSICA',
    description: 'Minha Casa Minha Vida Program'
  },

  PESSOAL: {
    internal: 'PESSOAL',
    bcbNames: ['CRÉDITO PESSOAL', 'EMPRÉSTIMO PESSOAL', 'CRÉDITO PESSOAL SEM CONSIGNAÇÃO'],
    segment: 'PESSOA FÍSICA',
    description: 'Personal loan'
  },

  CONSIGNADO_PUBLICO: {
    internal: 'CONSIGNADO_PUBLICO',
    bcbNames: ['CRÉDITO CONSIGNADO - SERVIDOR PÚBLICO'],
    segment: 'PESSOA FÍSICA',
    description: 'Consigned loan - Public server'
  },

  CONSIGNADO_PRIVADO: {
    internal: 'CONSIGNADO_PRIVADO',
    bcbNames: ['CRÉDITO CONSIGNADO - PRIVADO'],
    segment: 'PESSOA FÍSICA',
    description: 'Consigned loan - Private sector'
  },

  CONSIGNADO_INSS: {
    internal: 'CONSIGNADO_INSS',
    bcbNames: ['CRÉDITO CONSIGNADO - INSS'],
    segment: 'PESSOA FÍSICA',
    description: 'Consigned loan - INSS beneficiaries'
  },

  CAPITAL_GIRO: {
    internal: 'CAPITAL_GIRO',
    bcbNames: ['CAPITAL DE GIRO'],
    segment: 'PESSOA JURÍDICA',
    description: 'Business working capital'
  },

  DESCONTO_DUPLICATAS: {
    internal: 'DESCONTO_DUPLICATAS',
    bcbNames: ['DESCONTO DE DUPLICATAS'],
    segment: 'PESSOA JURÍDICA',
    description: 'Invoice discounting'
  },

  FINAME: {
    internal: 'FINAME',
    bcbNames: ['FINAME'],
    segment: 'PESSOA JURÍDICA',
    description: 'Equipment financing (FINAME)'
  },

  RURAL: {
    internal: 'RURAL',
    bcbNames: ['CRÉDITO RURAL'],
    segment: 'PESSOA JURÍDICA',
    description: 'Agricultural credit'
  }
}
```

### 4.2 Bank Mapping

```typescript
interface BankMapping {
  code: string;
  name: string;
  bcbOlindaName: string;
  cnpj: string;
  cnpj8: string;
}

const BANK_MAPPING: BankMapping[] = [
  {
    code: 'CAIXA',
    name: 'Caixa Econômica Federal',
    bcbOlindaName: 'CAIXA ECONÔMICA FEDERAL',
    cnpj: '104236027000166',
    cnpj8: '10423602'
  },
  {
    code: 'SANTANDER',
    name: 'Santander',
    bcbOlindaName: 'BANCO SANTANDER (BRASIL) S.A.',
    cnpj: '033000000001',
    cnpj8: '03300000'
  },
  {
    code: 'BB',
    name: 'Banco do Brasil',
    bcbOlindaName: 'BANCO DO BRASIL S/A',
    cnpj: '001130000000190',
    cnpj8: '00113000'
  },
  {
    code: 'ITAU',
    name: 'Itaú Unibanco',
    bcbOlindaName: 'ITAU UNIBANCO S.A.',
    cnpj: '060701190000123',
    cnpj8: '06070119'
  },
  {
    code: 'BRADESCO',
    name: 'Banco Bradesco',
    bcbOlindaName: 'BANCO BRADESCO S.A.',
    cnpj: '060746948000121',
    cnpj8: '06074694'
  }
]
```

---

## 5. Use Cases & Scenarios

### 5.0 IMPORTANT: Rate Staleness Warning

**Every simulation must display:**

```
⚠️ Taxas consultadas em: 21/06/2026 às 14:30
Atualização: 5-10 dias úteis de atraso
Validade: Até 22/06/2026 às 14:30
Sujeita a alteração: SIM

❗ Estas são TAXAS INDICATIVAS apenas para consulta.
   Ao contratar, solicite nova cotação com o banco.
```

**Code implementation:**

```typescript
interface SimulationOutput {
  simulationId: string;
  results: BankSimulationResult[];
  // ✨ NEW FIELDS:
  rateQueryTimestamp: ISO8601;      // When rates were fetched
  rateValidUntil: ISO8601;          // When rates expire
  dataSourceDelay: string;          // "5-10 business days"
  disclaimer: string;               // Legal disclaimer
  requiresUserConsent: boolean;      // Must user acknowledge?
}

// In WhatsApp message:
const formatSimulationMessage = (simulation: SimulationOutput) => {
  return `
  Simulação realizada em ${simulation.rateQueryTimestamp}
  ⚠️ Taxas consultadas com atraso de ${simulation.dataSourceDelay}
  
  ${simulation.results.map(r => formatBank(r)).join('\n')}
  
  ${simulation.disclaimer}
  `;
};
```

---

### 5.1 UC-1: Fetch Current Rates

**Actor:** CreateSimulationUseCase  
**Preconditions:** User has selected financing type and modality  
**Main Flow:**

```gherkin
Given the financing type is "veiculo" (CDC modality)
When FetchAndCacheBankRatesUseCase.execute("veiculo") is called
Then the system should:
  1. Check cache for rates dated today
  2. If cache miss:
     a. Query OLINDA API for CDC rates
     b. Filter for "PESSOA FÍSICA" segment
     c. Parse all banks' rates
     d. Store in database with source='open_finance'
     e. Cache for 24 hours
  3. Return array of rates with structure:
     {
       bankCode: string
       bankName: string
       modality: "CDC"
       rateAnnual: number
       source: "open_finance" | "manual"
       effectiveDate: string
     }
```

**Alternatives:**
- If OLINDA fails → try SGS API (20714, 20715)
- If SGS fails → use fallback rates
- If DB insert fails → log error but continue with fallback

### 5.2 UC-2: Validate Rate Against Reference

**Actor:** CreateSimulationUseCase (secondary)  
**Preconditions:** Rate fetched from OLINDA  
**Main Flow:**

```gherkin
Given rate from OLINDA is 47.82% a.a. for CDC
When ValidateBankRateUseCase.execute(rate, "CDC") is called
Then:
  1. Fetch Selic meta rate from SGS (series 432)
  2. Calculate spread = rate - selic
  3. Validate spread is within reasonable bounds:
     - CDC spread should be 15-50 p.p. above Selic
     - Vehicle financing should be 12-40 p.p. above Selic
  4. If spread too high or too low:
     - Log warning
     - Accept rate but flag in metadata
  5. Return validation result with confidence score
```

### 5.3 UC-3: Handle API Failure Gracefully

**Actor:** FetchAndCacheBankRatesUseCase  
**Preconditions:** OLINDA API is down  
**Main Flow:**

```gherkin
Given OLINDA API returns HTTP 503 or times out
When fetch is attempted
Then:
  1. Log error with full context (timestamp, request, response)
  2. Return empty array from fetchRates()
  3. FetchAndCacheBankRates detects ratesInserted === 0
  4. Call insertFallbackRates() with all banks
  5. Log: "Fallback rates inserted: {count} rates for {financing_type}"
  6. Continue simulation with fallback rates
  7. Alert: Send notification that BCB API unavailable
```

---

## 6. Database Schema

### 6.1 bank_rates Table

```typescript
interface BankRate {
  id: string;           // UUID
  bank_id: string;      // FK → banks.id
  modality: string;     // CDC, LEASING, SFH, etc
  rate_annual: string;  // Numeric(8,6) - 10.500000
  referential_rate_indexer: string;  // Numeric(8,6) - 0.000000
  min_term_months: number;
  max_term_months: number;
  max_ltv: string;      // Numeric(5,4) - 0.8000
  effective_date: string;  // ISO date - 2026-06-21
  source: 'open_finance' | 'manual';  // ✨ NEW
  created_at: timestamp;
  updated_at: timestamp;
  metadata?: {
    olinda_posicao?: number;  // Ranking from OLINDA
    spread_to_selic?: number; // Debug field
    validation_score?: number; // 0-100 confidence
  }
}
```

### 6.2 bank_rates Indexes

```sql
-- Optimized for common queries
CREATE INDEX idx_bank_rates_modality_effective_date 
ON bank_rates(modality, effective_date DESC);

CREATE INDEX idx_bank_rates_bank_source 
ON bank_rates(bank_id, source);

CREATE INDEX idx_bank_rates_active 
ON bank_rates(modality) 
WHERE effective_date >= CURRENT_DATE - INTERVAL '10 days';
```

---

## 7. Test Specifications

### 7.1 Unit Tests

#### Test Suite: BcbOlindaProviderImplementation

```typescript
describe('BcbOlindaProviderImplementation', () => {
  describe('fetchRates()', () => {
    
    it('should fetch rates for CDC from OLINDA', async () => {
      // Given
      const provider = new BcbOlindaProviderImplementation();
      
      // When
      const rates = await provider.fetchRates('BB', 'CDC');
      
      // Then
      expect(rates).toBeDefined();
      expect(rates.length).toBeGreaterThan(0);
      expect(rates[0]).toMatchObject({
        bankCode: 'BB',
        modality: 'CDC',
        rateAnnual: expect.any(Number),
        rateAnnual: expect.toBeGreaterThan(0),
        rateAnnual: expect.toBeLessThan(100)
      });
    });

    it('should return empty array on HTTP error', async () => {
      // Given
      const provider = new BcbOlindaProviderImplementation();
      nock('https://olinda.bcb.gov.br')
        .get(/.*/)
        .reply(503);
      
      // When
      const rates = await provider.fetchRates('BB', 'CDC');
      
      // Then
      expect(rates).toEqual([]);
    });

    it('should return empty array on network timeout', async () => {
      // Given
      const provider = new BcbOlindaProviderImplementation();
      
      // When
      const rates = await provider.fetchRates('BB', 'CDC');
      // ... (with mock timeout after 8s)
      
      // Then
      expect(rates).toEqual([]);
    });

    it('should parse OLINDA response correctly', async () => {
      // Given
      const mockResponse = {
        value: [
          {
            InstituicaoFinanceira: 'BANCO DO BRASIL S/A',
            Modalidade: 'CRÉDITO PESSOAL',
            TaxaJurosAoAno: 47.82,
            cnpj8: '00113000',
            Posicao: 1
          }
        ]
      };
      const provider = new BcbOlindaProviderImplementation();
      // ... mock fetch
      
      // When
      const rates = await provider.fetchRates('BB', 'CDC');
      
      // Then
      expect(rates[0]).toEqual({
        bankCode: 'BB',
        modality: 'CDC',
        rateAnnual: 47.82,
        referentialRateIndexer: 0,
        minTermMonths: 6,
        maxTermMonths: 84,
        maxLtv: 1.0
      });
    });

    it('should handle malformed JSON response', async () => {
      // Given
      const provider = new BcbOlindaProviderImplementation();
      nock('https://olinda.bcb.gov.br')
        .get(/.*/)
        .reply(200, 'INVALID JSON');
      
      // When
      const rates = await provider.fetchRates('BB', 'CDC');
      
      // Then
      expect(rates).toEqual([]);
    });
  });

  describe('fetchReferenceTaxes()', () => {
    
    it('should fetch Selic meta rate from SGS', async () => {
      // Given
      const provider = new BcbOlindaProviderImplementation();
      
      // When
      const selic = await provider.fetchReferenceTaxes();
      
      // Then
      expect(selic).toHaveProperty('selicMeta');
      expect(selic).toHaveProperty('cdi');
      expect(selic).toHaveProperty('date');
      expect(selic.selicMeta).toBeGreaterThan(0);
      expect(selic.selicMeta).toBeLessThan(100);
    });

    it('should cache reference taxes for 24 hours', async () => {
      // Given
      const provider = new BcbOlindaProviderImplementation();
      const cache = new InMemoryCache();
      
      // When
      const taxes1 = await provider.fetchReferenceTaxes();
      const taxes2 = await provider.fetchReferenceTaxes();
      
      // Then
      expect(cache.get('reference_taxes_latest')).toBeDefined();
      // Both calls should return same data (from cache)
      expect(taxes1).toEqual(taxes2);
    });
  });
});
```

#### Test Suite: FetchAndCacheBankRatesUseCase

```typescript
describe('FetchAndCacheBankRatesUseCase', () => {
  let useCase: FetchAndCacheBankRatesUseCase;
  let mockDb: any;
  let mockCache: any;
  let mockProvider: any;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockCache = createMockCache();
    mockProvider = createMockOpenFinanceProvider();
    useCase = new FetchAndCacheBankRatesUseCase(mockDb, mockCache, mockProvider);
  });

  describe('execute()', () => {
    
    it('should fetch and persist rates for veiculo modality', async () => {
      // Given
      mockProvider.fetchRates.mockResolvedValue([
        {
          bankCode: 'BB',
          modality: 'CDC',
          rateAnnual: 47.82,
          referentialRateIndexer: 0,
          minTermMonths: 6,
          maxTermMonths: 84,
          maxLtv: 1.0
        }
      ]);

      // When
      await useCase.execute('veiculo');

      // Then
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          values: expect.arrayContaining([
            expect.objectContaining({
              modality: 'CDC',
              source: 'open_finance'
            })
          ])
        })
      );
    });

    it('should call insertFallbackRates when no API rates found', async () => {
      // Given
      mockProvider.fetchRates.mockResolvedValue([]);
      const spy = jest.spyOn(useCase, 'insertFallbackRates' as any);

      // When
      await useCase.execute('veiculo');

      // Then
      expect(spy).toHaveBeenCalledWith(
        expect.any(Array), // banks
        expect.arrayContaining(['CDC', 'LEASING']), // modalities
        expect.any(String) // today
      );
    });

    it('should auto-create banks if none exist', async () => {
      // Given
      mockDb.select().from().where().mockResolvedValue([]);

      // When
      await useCase.execute('veiculo');

      // Then
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.any(String) })
      );
      // After creating banks, should re-query them
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });

    it('should cache rates for 24 hours', async () => {
      // Given
      const cacheKey = 'rates:BB:CDC:2026-06-21';
      mockCache.get.mockResolvedValue(null);

      // When
      await useCase.execute('veiculo');

      // Then
      expect(mockCache.set).toHaveBeenCalledWith(
        cacheKey,
        expect.any(String),
        24 * 60 * 60
      );
    });

    it('should skip cache fetch if rate already cached', async () => {
      // Given
      const cached = JSON.stringify({
        bankCode: 'BB',
        rateAnnual: 47.82
      });
      mockCache.get.mockResolvedValue(cached);

      // When
      await useCase.execute('veiculo');

      // Then
      expect(mockProvider.fetchRates).not.toHaveBeenCalled();
    });

    it('should log rate fetch statistics', async () => {
      // Given
      const logSpy = jest.spyOn(logger, 'info');

      // When
      await useCase.execute('veiculo');

      // Then
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Taxas obtidas'),
        expect.objectContaining({
          modalitiesCount: expect.any(Number),
          ratesFound: expect.any(Number)
        })
      );
    });
  });
});
```

### 7.2 Integration Tests

```typescript
describe('Open Finance Integration', () => {
  
  it('should fetch real rates from OLINDA BCB', async () => {
    // This test runs against the real OLINDA API
    // Tag: @integration @slow
    
    // Given
    const provider = new BcbOlindaProviderImplementation();
    
    // When
    const rates = await provider.fetchRates('BB', 'CDC');
    
    // Then
    expect(rates.length).toBeGreaterThan(0);
    expect(rates[0].rateAnnual).toBeGreaterThan(0);
    // OLINDA is available (99.9% uptime)
  }, 30000); // 30s timeout

  it('should fetch real Selic rate from SGS', async () => {
    // Tag: @integration @slow
    
    // Given
    const provider = new BcbOlindaProviderImplementation();
    
    // When
    const taxes = await provider.fetchReferenceTaxes();
    
    // Then
    expect(taxes.selicMeta).toBeGreaterThan(0);
    expect(taxes.selicMeta).toBeLessThan(30); // Reasonable range
  }, 30000);

  it('should successfully simulate with real rates', async () => {
    // Tag: @integration @slow @e2e
    
    // Given
    const input: SimulationInput = {
      whatsappNumber: 'test@example.com',
      financingType: 'veiculo',
      requestedAmount: 69000,
      downPaymentAmount: 30000,
      termMonths: 36,
      vehicleBrand: 'Mitsubishi',
      vehicleModel: 'ASX 2.0'
    };
    
    const useCase = new CreateSimulationUseCase(realDb, realCache, realWsHub);
    
    // When
    const result = await useCase.execute(input);
    
    // Then
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].rateAnnual).toBeGreaterThan(0);
    // All results should have valid calculations
    result.results.forEach(r => {
      expect(r.sac.firstInstallment).toBeGreaterThan(0);
      expect(r.price.fixedInstallment).toBeGreaterThan(0);
    });
  }, 60000);
});
```

---

## 8. Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**Tasks:**
1. ✅ Create `BcbOlindaProviderImplementation` class
   - Implement `fetchRates(bankCode, modality)`
   - Implement `fetchReferenceTaxes()`
   - Add error handling and logging
   
2. ✅ Create `BcbSgsProviderImplementation` class
   - Implement `fetchSeriesData(serieId, dateRange)`
   - Parse SGS response format
   
3. ✅ Create `ModalityMapper` utility
   - Map internal modalities → BCB modalities
   - Validate mappings with test cases
   
4. ✅ Update database schema
   - Add `source` column to `bank_rates`
   - Add metadata JSONB field for validation data

**Tests to Pass:**
- Unit tests for all provider methods
- 100% code coverage for happy path

---

### Phase 2: Integration & Caching (Week 2)

**Tasks:**
1. Update `FetchAndCacheBankRatesUseCase`
   - Use new providers instead of fake URLs
   - Implement retry logic (3 attempts with exponential backoff)
   - Add rate validation against Selic
   
2. Update `GetBankRatesUseCase`
   - Query only rates with `source = 'open_finance'`
   - Fall back to `source = 'manual'` if no open_finance rates
   
3. Cache layer improvements
   - Implement 24h TTL for rates
   - Implement 6h TTL for reference taxes
   - Add cache warmup on startup

**Tests to Pass:**
- Integration tests with real OLINDA API (tagged @integration)
- End-to-end simulation test with real rates

---

### Phase 3: Monitoring & Optimization (Week 3)

**Tasks:**
1. Add comprehensive logging
   - Log every API call (timestamp, endpoint, duration, response code)
   - Alert on repeated failures
   
2. Add metrics
   - Track API response times
   - Track cache hit/miss ratios
   - Track fallback rate usage
   
3. Setup health checks
   - Background job to verify OLINDA/SGS availability every 6h
   - Graceful degradation to fallback rates
   
4. Documentation
   - Update API integration guide
   - Add troubleshooting section
   - Document rate validation rules

**Tests to Pass:**
- Load tests (100 concurrent simulations)
- Failure scenario tests (API down, timeout, invalid data)

---

## 9. Error Handling Strategy

### 9.1 Error Matrix

| Scenario | Status Code | Action | Fallback |
|----------|-------------|--------|----------|
| OLINDA success | 200 | Use rates | ✅ |
| OLINDA temporarily unavailable | 503, 429 | Retry 3x with backoff | ✅ |
| OLINDA connection timeout | - | Wait 8s max | ✅ |
| OLINDA malformed JSON | 200 | Log error | ✅ |
| SGS API down | Any | Log but continue | - |
| Database insert fails | Any | Log, use in-memory | ✅ |
| Cache unavailable | Any | Skip cache | ✅ |

### 9.2 Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
  jitter: true
};

// Retry on: 429, 503, 504, network timeout
// Don't retry on: 400, 401, 403, 404, 422
```

---

## 10. Logging Specification

### 10.1 Log Format

```typescript
// Every API call must log:
logger.info('OLINDA API call', {
  timestamp: ISO8601,
  bankCode: string,
  modality: string,
  endpoint: string,
  requestId: string,
  duration_ms: number,
  status_code: number,
  rates_found: number,
  cache_hit: boolean,
  source: 'open_finance' | 'manual',
  errors: string[] | null
});

// Example:
{
  "timestamp": "2026-06-21T14:30:45.123Z",
  "bankCode": "BB",
  "modality": "CDC",
  "endpoint": "https://olinda.bcb.gov.br/olinda/servico/...",
  "requestId": "req_abc123xyz",
  "duration_ms": 1240,
  "status_code": 200,
  "rates_found": 1,
  "cache_hit": false,
  "source": "open_finance"
}
```

---

## 11. Migration Path

### 11.1 Backward Compatibility

```typescript
// Phase transition:
// Week 1: Both providers active, OLINDA primary, fallback to fake URLs
// Week 2: Remove fake URL provider entirely
// Week 3: Remove fallback rates from code (only use auto-generated)

interface OpenFinanceProvider {
  // Keep interface same - smooth transition
  fetchRates(bankCode: string, modality: FinancingModality): Promise<OpenFinanceRate[]>;
}

// old: HttpOpenFinanceProviderImplementation (with fake URLs)
// new: BcbOlindaProviderImplementation (with real API)
// fallback: insertFallbackRates() (hardcoded as last resort)
```

---

## 11.5 Temporal Data Disclaimer

```typescript
// MUST be added to all simulation outputs and UI messages:

const DATA_DISCLAIMER = {
  ptBr: `
⚠️ AVISO IMPORTANTE SOBRE PRAZOS E ALTERAÇÕES

1. ATRASO NA DISPONIBILIZAÇÃO DE DADOS
   • As taxas consultadas têm atraso de 5-10 dias úteis
   • Exemplo: Consulta em 21/06/2026 retorna taxas de ~11-16/06/2026
   • Isso não significa que as taxas estão "antigas" - é o padrão do BCB

2. VALORES PODEM SOFRER ALTERAÇÕES
   • Taxas mudam diariamente conforme condições de mercado
   • Entre a consulta e a contratação, o banco pode alterar as taxas
   • Estas são TAXAS INDICATIVAS apenas para planejamento

3. VALIDADE DA COTAÇÃO
   • Válida por: 24 horas (até ${addHours(now(), 24).toISOString()})
   • Solicite nova cotação se contratar após esse prazo
   • Confirme a taxa com o banco ANTES de assinar qualquer contrato

4. O QUE FAZER
   ✓ Use esta simulação para comparar bancos
   ✓ Solicite proposta formal ao banco escolhido
   ✓ Verifique a taxa final na proposta (pode ser menor ou maior)
   ✓ Leia o contrato com atenção antes de assinar

⚠️ Este bot não substitui atendimento de especialista financeiro.
  `,
  
  en: `
⚠️ IMPORTANT NOTICE ON TIMING AND RATE CHANGES

1. DATA AVAILABILITY DELAY
   • Quoted rates have a 5-10 business day lag
   • Example: Query on 06/21/2026 returns rates from ~06/11-16/2026
   • This is the standard Brazilian Central Bank (BCB) practice

2. RATES ARE SUBJECT TO CHANGE
   • Rates change daily based on market conditions
   • The rate quoted here may differ when you actually apply
   • These are INDICATIVE RATES for planning purposes only

3. QUOTATION VALIDITY
   • Valid for: 24 hours (until ${addHours(now(), 24).toISOString()})
   • Request a new quote if applying after this period
   • Confirm the final rate with the bank BEFORE signing

4. WHAT TO DO
   ✓ Use this simulation to compare banks
   ✓ Request a formal proposal from your chosen bank
   ✓ Verify the final rate in the proposal (may be lower or higher)
   ✓ Read the contract carefully before signing

⚠️ This bot does not replace specialized financial advice.
  `
};
```

---

## 12. Success Criteria

### 12.1 Acceptance Criteria

- ✅ Simulation returns rates from real OLINDA API (not fallback)
- ✅ All 5 banks (CAIXA, SANTANDER, BB, ITAU, BRADESCO) have rates
- ✅ Rates match market conditions (validated against Selic spread)
- ✅ Cache operates correctly (24h TTL, hit/miss logging)
- ✅ Fallback rates used only if OLINDA down (logged)
- ✅ All test suites pass (unit + integration)
- ✅ Zero regressions in simulation calculations
- ✅ Response time < 2s for cached rates, < 5s for fresh fetch

### 12.2 Performance Benchmarks

| Scenario | Target | Actual |
|----------|--------|--------|
| Fetch rates (cache hit) | < 100ms | - |
| Fetch rates (cache miss) | < 2s | - |
| Simulation with cached rates | < 1.5s | - |
| Simulation with fresh fetch | < 4s | - |

---

## 13. References

- [Banco Central OLINDA API](https://olinda.bcb.gov.br/)
- [BCB SGS API Docs](https://dadosabertos.bcb.gov.br/)
- [Brazil Visible Project](https://github.com/nferdica/brazil-visible)
- [Open Banking Brasil Standard](https://openfinancebrasil.atlassian.net/)

---

## 14. Glossary

| Term | Definition |
|------|-----------|
| **OLINDA** | Open API do Banco Central para taxas de juros |
| **SGS** | Sistema de Gerenciamento de Séries (BCB time series) |
| **OData** | Data access protocol used by OLINDA (OData v4) |
| **p.p.** | Percentage points (e.g., 2% vs 1.5% = 0.5 p.p. spread) |
| **Spread** | Difference between lending rate and reference rate (Selic) |
| **CDC** | Crédito Direto ao Consumidor (Consumer directed credit) |
| **SFH** | Sistema Financeiro da Habitação (Brazilian housing system) |
| **CNPJ8** | First 8 digits of CNPJ (institution identifier) |

---

**Document Version:** 1.0  
**Last Updated:** June 21, 2026  
**Status:** Ready for Development  
**Next Review:** Weekly (Sprint Planning)
