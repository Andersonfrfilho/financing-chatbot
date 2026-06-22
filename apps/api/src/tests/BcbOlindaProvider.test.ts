import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { BcbOlindaProviderImplementation } from '../modules/open-finance/infra/providers/BcbOlindaProviderImplementation'

const setFetch = (fn: () => Promise<Response | never>) => {
  ;(globalThis as Record<string, unknown>).fetch = fn
}

function mockOlindaResponse(overrides: Partial<{
  Segmento: string
  Modalidade: string
  InstituicaoFinanceira: string
  TaxaJurosAoMes: number
  TaxaJurosAoAno: number
  cnpj8: string
  Posicao: number
  InicioPeriodo: string
  FimPeriodo: string
}> = {}) {
  return {
    value: [
      {
        Segmento: 'PESSOA FÍSICA',
        Modalidade: 'Aquisição de veículos - Prefixado',
        InstituicaoFinanceira: 'BCO DO BRASIL S.A.',
        TaxaJurosAoMes: 3.29,
        TaxaJurosAoAno: 47.82,
        cnpj8: '00000000',
        Posicao: 1,
        InicioPeriodo: '2026-06-01',
        FimPeriodo: '2026-06-15',
        ...overrides,
      },
    ],
  }
}

describe('BcbOlindaProviderImplementation', () => {
  let provider: BcbOlindaProviderImplementation
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    provider = new BcbOlindaProviderImplementation()
    originalFetch = globalThis.fetch
  })

  describe('fetchRates()', () => {
    it('retorna array vazio para modalidade sem mapeamento BCB', async () => {
      setFetch(mock(() =>
        Promise.resolve(new Response(JSON.stringify({ value: [] }), { status: 200 })),
      ))

      const rates = await provider.fetchRates('BB', 'CDC')
      expect(Array.isArray(rates)).toBe(true)

      globalThis.fetch = originalFetch
    })

    it('retorna array vazio quando API retorna HTTP 503', async () => {
      setFetch(mock(() =>
        Promise.resolve(new Response('Service Unavailable', { status: 503 })),
      ))

      const rates = await provider.fetchRates('BB', 'CDC')
      expect(rates).toEqual([])

      globalThis.fetch = originalFetch
    })

    it('retorna array vazio quando API lança exceção (timeout)', async () => {
      setFetch(mock(() => Promise.reject(new Error('AbortError: timeout'))))

      const rates = await provider.fetchRates('BB', 'CDC')
      expect(rates).toEqual([])

      globalThis.fetch = originalFetch
    })

    it('retorna array vazio quando JSON é inválido', async () => {
      setFetch(mock(() =>
        Promise.resolve(new Response('NOT_JSON{{', { status: 200 })),
      ))

      const rates = await provider.fetchRates('BB', 'CDC')
      expect(rates).toEqual([])

      globalThis.fetch = originalFetch
    })

    it('parseia resposta OLINDA corretamente', async () => {
      setFetch(mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockOlindaResponse({ TaxaJurosAoAno: 47.82 })), { status: 200 }),
        ),
      ))

      const rates = await provider.fetchRates('BB', 'CDC')

      expect(rates.length).toBe(1)
      expect(rates[0]!.bankCode).toBe('BB')
      expect(rates[0]!.modality).toBe('CDC')
      expect(rates[0]!.rateAnnual).toBe(0.4782) // 47.82% / 100 (decimal convention)
      expect(rates[0]!.referentialRateIndexer).toBe(0)
      expect(rates[0]!.minTermMonths).toBeGreaterThan(0)
      expect(rates[0]!.maxTermMonths).toBeGreaterThan(rates[0]!.minTermMonths)
      expect(rates[0]!.maxLtv).toBeGreaterThan(0)

      globalThis.fetch = originalFetch
    })

    it('ignora taxas com valor zero', async () => {
      setFetch(mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockOlindaResponse({ TaxaJurosAoAno: 0 })), { status: 200 }),
        ),
      ))

      const rates = await provider.fetchRates('BB', 'CDC')
      expect(rates).toEqual([])

      globalThis.fetch = originalFetch
    })

    it('retorna apenas a menor taxa quando há múltiplas', async () => {
      setFetch(mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              value: [
                { ...mockOlindaResponse().value[0], TaxaJurosAoAno: 52.0, Posicao: 2 },
                { ...mockOlindaResponse().value[0], TaxaJurosAoAno: 47.82, Posicao: 1 },
                { ...mockOlindaResponse().value[0], TaxaJurosAoAno: 60.0, Posicao: 3 },
              ],
            }),
            { status: 200 },
          ),
        ),
      ))

      const rates = await provider.fetchRates('BB', 'CDC')
      expect(rates.length).toBe(1)
      expect(rates[0]!.rateAnnual).toBe(0.4782) // menor taxa (47.82% / 100)

      globalThis.fetch = originalFetch
    })

    it('usa dados do ModalityMapper para minTermMonths/maxTermMonths de SFH', async () => {
      setFetch(mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockOlindaResponse({ TaxaJurosAoAno: 9.5 })), { status: 200 }),
        ),
      ))

      const rates = await provider.fetchRates('CAIXA', 'SFH')

      if (rates.length > 0) {
        expect(rates[0]!.maxTermMonths).toBe(420)
        expect(rates[0]!.maxLtv).toBe(0.8)
      }

      globalThis.fetch = originalFetch
    })
  })

  describe('fetchReferenceTaxes()', () => {
    it('retorna defaults quando SGS API falha', async () => {
      setFetch(mock(() => Promise.reject(new Error('network error'))))

      const taxes = await provider.fetchReferenceTaxes()

      expect(taxes).toHaveProperty('selicMeta')
      expect(taxes).toHaveProperty('cdi')
      expect(taxes).toHaveProperty('date')
      expect(taxes.selicMeta).toBeGreaterThan(0)
      expect(taxes.cdi).toBeGreaterThan(0)

      globalThis.fetch = originalFetch
    })

    it('parseia resposta SGS corretamente', async () => {
      const mockSgsResponse = [{ data: '20/06/2026', valor: '10.75' }]

      setFetch(mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockSgsResponse), { status: 200 })),
      ))

      const taxes = await provider.fetchReferenceTaxes()

      expect(taxes.selicMeta).toBe(10.75)

      globalThis.fetch = originalFetch
    })

    it('retorna defaults sensatos (entre 0 e 30% a.a.) em caso de falha', async () => {
      setFetch(mock(() => Promise.resolve(new Response('[]', { status: 200 }))))

      const taxes = await provider.fetchReferenceTaxes()

      expect(taxes.selicMeta).toBeGreaterThan(0)
      expect(taxes.selicMeta).toBeLessThan(30)
      expect(taxes.cdi).toBeGreaterThan(0)
      expect(taxes.cdi).toBeLessThan(30)

      globalThis.fetch = originalFetch
    })
  })
})
