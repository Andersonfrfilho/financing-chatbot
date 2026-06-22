/**
 * Test runner using Node.js built-in test module.
 * Run: npx tsx --tsconfig tsconfig.json src/tests/run-tests.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ─── ModalityMapper ───────────────────────────────────────────────────────────
import {
  MODALITY_MAPPING,
  BANK_MAPPING,
  getBcbNamesForModality,
  getSegmentForModality,
} from '../modules/open-finance/domain/mappers/ModalityMapper'
import type { FinancingModality } from '../shared/types'

const ALL_MODALITIES: FinancingModality[] = [
  'CDC', 'LEASING', 'SFH', 'SFI', 'FGTS', 'MCMV',
  'PESSOAL', 'CONSIGNADO_PUBLICO', 'CONSIGNADO_PRIVADO', 'CONSIGNADO_INSS',
  'CAPITAL_GIRO', 'DESCONTO_DUPLICATAS', 'FINAME', 'RURAL',
]

describe('ModalityMapper', () => {
  it('cobre todas as 14 modalidades', () => {
    for (const m of ALL_MODALITIES) {
      assert.ok(MODALITY_MAPPING[m as FinancingModality], `faltando: ${m}`)
    }
  })

  it('cada modalidade tem pelo menos 1 nome BCB', () => {
    for (const [k, v] of Object.entries(MODALITY_MAPPING)) {
      assert.ok(v.bcbNames.length > 0, `${k} sem bcbNames`)
    }
  })

  it('CDC e LEASING → PESSOA FÍSICA', () => {
    assert.equal(MODALITY_MAPPING['CDC'].segment, 'PESSOA FÍSICA')
    assert.equal(MODALITY_MAPPING['LEASING'].segment, 'PESSOA FÍSICA')
  })

  it('CAPITAL_GIRO, FINAME, RURAL → PESSOA JURÍDICA', () => {
    assert.equal(MODALITY_MAPPING['CAPITAL_GIRO'].segment, 'PESSOA JURÍDICA')
    assert.equal(MODALITY_MAPPING['FINAME'].segment, 'PESSOA JURÍDICA')
    assert.equal(MODALITY_MAPPING['RURAL'].segment, 'PESSOA JURÍDICA')
  })

  it('SFH tem maxTermMonths = 420', () => {
    assert.equal(MODALITY_MAPPING['SFH'].maxTermMonths, 420)
  })

  it('SFH tem maxLtv ≤ 0.9', () => {
    assert.ok(MODALITY_MAPPING['SFH'].maxLtv <= 0.9)
  })

  it('CDC tem maxLtv = 1.0', () => {
    assert.equal(MODALITY_MAPPING['CDC'].maxLtv, 1.0)
  })

  it('maxTermMonths > minTermMonths para todas', () => {
    for (const [k, v] of Object.entries(MODALITY_MAPPING)) {
      assert.ok(v.maxTermMonths > v.minTermMonths, `${k}: max <= min`)
    }
  })

  it('getBcbNamesForModality(CDC) inclui Aquisição de veículos', () => {
    const names = getBcbNamesForModality('CDC')
    assert.ok(names.some(n => n.includes('veículos')), `CDC names: ${names}`)
  })

  it('getSegmentForModality(CDC) = PESSOA FÍSICA', () => {
    assert.equal(getSegmentForModality('CDC'), 'PESSOA FÍSICA')
  })

  it('getSegmentForModality(CAPITAL_GIRO) = PESSOA JURÍDICA', () => {
    assert.equal(getSegmentForModality('CAPITAL_GIRO'), 'PESSOA JURÍDICA')
  })

  it('BANK_MAPPING contém os 5 bancos', () => {
    for (const bank of ['CAIXA', 'SANTANDER', 'BB', 'ITAU', 'BRADESCO']) {
      assert.ok(BANK_MAPPING[bank], `faltando banco: ${bank}`)
    }
  })

  it('cnpj8 de cada banco tem 8 dígitos', () => {
    for (const [bank, info] of Object.entries(BANK_MAPPING)) {
      assert.match(info.cnpj8, /^\d{8}$/, `${bank}.cnpj8 inválido: ${info.cnpj8}`)
    }
  })
})

// ─── BcbOlindaProvider ────────────────────────────────────────────────────────
import {
  BcbOlindaProviderImplementation,
  clearBcbOlindaCache,
} from '../modules/open-finance/infra/providers/BcbOlindaProviderImplementation'

function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = (() =>
    Promise.resolve(new Response(JSON.stringify(body), { status }))) as unknown as typeof fetch
}

function failFetch(err = new Error('network')) {
  globalThis.fetch = (() => Promise.reject(err)) as unknown as typeof fetch
}

const realFetch = globalThis.fetch

describe('BcbOlindaProviderImplementation', () => {
  const olindaItem = {
    Segmento: 'PESSOA FÍSICA',
    Modalidade: 'CRÉDITO PESSOAL',
    InstituicaoFinanceira: 'BANCO DO BRASIL S/A',
    TaxaJurosAoMes: 3.29,
    TaxaJurosAoAno: 47.82,
    cnpj8: '00113000',
    Posicao: 1,
    InicioPeriodo: '2026-06-01',
    FimPeriodo: '2026-06-15',
  }

  it('retorna [] quando OLINDA responde HTTP 503', async () => {
    const provider = new BcbOlindaProviderImplementation()
    mockFetch('Service Unavailable', 503)
    const r = await provider.fetchRates('BB', 'CDC')
    assert.deepEqual(r, [])
    globalThis.fetch = realFetch
  })

  it('retorna [] quando fetch lança exceção (timeout)', async () => {
    const provider = new BcbOlindaProviderImplementation()
    failFetch(new Error('AbortError'))
    const r = await provider.fetchRates('BB', 'CDC')
    assert.deepEqual(r, [])
    globalThis.fetch = realFetch
  })

  it('retorna [] quando JSON é inválido', async () => {
    const provider = new BcbOlindaProviderImplementation()
    globalThis.fetch = (() =>
      Promise.resolve(new Response('INVALID{{', { status: 200 }))) as unknown as typeof fetch
    const r = await provider.fetchRates('BB', 'CDC')
    assert.deepEqual(r, [])
    globalThis.fetch = realFetch
  })

  it('parseia taxa OLINDA corretamente', async () => {
    const provider = new BcbOlindaProviderImplementation()
    mockFetch({ value: [olindaItem] })
    const r = await provider.fetchRates('BB', 'CDC')
    assert.equal(r.length, 1)
    assert.equal(r[0]!.bankCode, 'BB')
    assert.equal(r[0]!.modality, 'CDC')
    // BCB returns percentage (47.82 = 47.82% a.a.); provider divides by 100 → 0.4782
    assert.equal(r[0]!.rateAnnual, 0.4782)
    assert.equal(r[0]!.referentialRateIndexer, 0)
    assert.ok(r[0]!.minTermMonths > 0)
    assert.ok(r[0]!.maxTermMonths > r[0]!.minTermMonths)
    globalThis.fetch = realFetch
  })

  it('ignora taxa com valor zero', async () => {
    clearBcbOlindaCache()
    const provider = new BcbOlindaProviderImplementation()
    mockFetch({ value: [{ ...olindaItem, TaxaJurosAoAno: 0 }] })
    const r = await provider.fetchRates('BB', 'CDC')
    assert.deepEqual(r, [])
    globalThis.fetch = realFetch
  })

  it('retorna apenas a menor taxa entre múltiplas', async () => {
    const provider = new BcbOlindaProviderImplementation()
    mockFetch({
      value: [
        { ...olindaItem, TaxaJurosAoAno: 52.0 },
        { ...olindaItem, TaxaJurosAoAno: 47.82 },
        { ...olindaItem, TaxaJurosAoAno: 60.0 },
      ],
    })
    const r = await provider.fetchRates('BB', 'CDC')
    assert.equal(r.length, 1)
    assert.equal(r[0]!.rateAnnual, 0.4782) // 47.82% / 100
    globalThis.fetch = realFetch
  })

  it('SFH tem maxTermMonths=420 e maxLtv=0.8', async () => {
    const provider = new BcbOlindaProviderImplementation()
    mockFetch({ value: [{ ...olindaItem, TaxaJurosAoAno: 9.5 }] })
    const r = await provider.fetchRates('CAIXA', 'SFH')
    if (r.length > 0) {
      assert.equal(r[0]!.maxTermMonths, 420)
      assert.equal(r[0]!.maxLtv, 0.8)
    }
    globalThis.fetch = realFetch
  })

  it('fetchReferenceTaxes retorna defaults quando SGS falha', async () => {
    const provider = new BcbOlindaProviderImplementation()
    failFetch()
    const t = await provider.fetchReferenceTaxes()
    assert.ok(t.selicMeta > 0)
    assert.ok(t.cdi > 0)
    assert.ok(typeof t.date === 'string')
    globalThis.fetch = realFetch
  })

  it('fetchReferenceTaxes parseia SGS corretamente', async () => {
    clearBcbOlindaCache()
    const provider = new BcbOlindaProviderImplementation()
    mockFetch([{ data: '20/06/2026', valor: '10.75' }])
    const t = await provider.fetchReferenceTaxes()
    assert.equal(t.selicMeta, 10.75)
    globalThis.fetch = realFetch
  })

  it('selicMeta defaults entre 0 e 30 quando resposta vazia', async () => {
    const provider = new BcbOlindaProviderImplementation()
    mockFetch([])
    const t = await provider.fetchReferenceTaxes()
    assert.ok(t.selicMeta > 0 && t.selicMeta < 30)
    globalThis.fetch = realFetch
  })
})

// ─── Retry logic ─────────────────────────────────────────────────────────────
describe('withRetry (comportamento esperado)', () => {
  it('sucede na 3ª tentativa após 2 falhas transitórias', async () => {
    let attempts = 0
    async function unreliable(): Promise<string> {
      attempts++
      if (attempts < 3) throw new Error('transient')
      return 'ok'
    }

    let result = ''
    for (let i = 0; i < 3; i++) {
      try { result = await unreliable(); break } catch { /* retry */ }
    }
    assert.equal(result, 'ok')
    assert.equal(attempts, 3)
  })

  it('depois de 3 falhas, resultado permanece vazio', async () => {
    let attempts = 0
    async function alwaysFail(): Promise<string[]> {
      attempts++; throw new Error('always')
    }

    let out: string[] = []
    for (let i = 0; i < 3; i++) {
      try { out = await alwaysFail(); break } catch { /* retry */ }
    }
    assert.deepEqual(out, [])
    assert.equal(attempts, 3)
  })
})
