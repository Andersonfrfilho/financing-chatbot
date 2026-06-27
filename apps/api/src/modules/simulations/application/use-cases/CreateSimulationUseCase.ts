import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { CacheProvider } from '@/shared/providers/CacheProvider'
import type { WebSocketHub } from '@/infra/websocket/WebSocketHub'
import { WS_EVENTS } from '@/infra/websocket/WebSocketEvents'
import { logger } from '@/shared/logger'
import { SacCalculatorService } from '../services/SacCalculatorService'
import { PriceCalculatorService } from '../services/PriceCalculatorService'
import { MarketRatesService } from '../services/MarketRatesService'
import { FipeService } from '../services/FipeService'
import { CaixaMcmvCalculatorService } from '../services/CaixaMcmvCalculatorService'
import { GetBankRatesUseCase } from '@/modules/open-finance/application/use-cases/GetBankRatesUseCase'
import { FetchAndCacheBankRatesUseCase } from '@/modules/open-finance/application/use-cases/FetchAndCacheBankRatesUseCase'
import { BcbOlindaProviderImplementation } from '@/modules/open-finance/infra/providers/BcbOlindaProviderImplementation'
import type { FinancingModality } from '@/shared/types'
import * as schema from '@/infra/database/schema'

// Diferenciais por banco para CDC veículos (decimal, relativo à média BCB SGS 25466).
// Calibrado contra simulação real do Santander Financiamentos (R$ 3.052,94 em 48x = ~53% a.a. CET
// para ASX 2014, sem entrada). Bancos especializados em veículos (Santander Fin., BB) batem a média;
// Caixa é fraca em CDC de usado particular (foco em imóvel/veículo novo), logo fica acima.
// TODO: substituir por diferenciais calculados a partir das taxas reais do BCB OLINDA por banco (já implementado no BcbOlindaProviderImplementation)
const BANK_MARKET_DIFFERENTIAL: Record<string, number> = {
  'SANTANDER': -0.04,   // Santander Financiamentos: líder em veículos, agressivo
  'BB':        -0.03,   // Banco do Brasil: competitivo em CDC veículo
  'ITAU':      -0.01,   // Itaú: próximo da média
  'BRADESCO':  +0.01,   // Bradesco: levemente acima
  'CAIXA':     +0.03,   // Caixa: fraca em CDC de usado particular
  'CEF':       +0.03,   // alias Caixa
}

// Taxa mínima realista para CDC veículo PF — abaixo disso, a taxa do DB é provavelmente fallback inválido
const MIN_REALISTIC_VEHICLE_RATE = 0.20 // 20% a.a.

const MODALITY_BY_TYPE: Record<string, FinancingModality[]> = {
  imobiliario: ['SFH', 'SFI', 'FGTS', 'MCMV'],
  veiculo: ['CDC'],
  pessoal: ['PESSOAL'],
  consignado: ['CONSIGNADO_PUBLICO', 'CONSIGNADO_PRIVADO', 'CONSIGNADO_INSS'],
  empresa: ['CAPITAL_GIRO'],
  equipamento: ['FINAME'],
  rural: ['RURAL'],
}

export interface SimulationInput {
  whatsappNumber?: string
  clientId?: string
  financingType: string
  requestedAmount: number
  downPaymentAmount: number
  termMonths: number
  // Imobiliário
  realEstateObjective?: string
  purchaseTimeline?: string
  includeFees?: boolean
  propertyValue?: number
  propertyType?: string
  propertyCity?: string
  propertyState?: string
  fgtsAmount?: number
  // Veículo
  vehicleType?: string
  vehicleBrand?: string
  vehicleModel?: string
  vehicleYear?: number
  vehicleFuel?: string
  sellerContext?: string
  purchaseIntent?: string
  hasCnh?: boolean
  residenceState?: string
  // Pessoal / Consignado
  employmentType?: string
  employer?: string
  loanPurpose?: string
  // Renda (comprometimento de renda / capacidade de pagamento)
  monthlyIncome?: number
  coParticipantIncome?: number
  // Proponente (Caixa MCMV: prazo máximo por idade e taxa MIP)
  applicantAgeYears?: number
  // Extra
  metadata?: Record<string, unknown>
}

export interface CaixaMcmvBreakdown {
  mcmvFaixa: number
  totalMip: number
  totalDfi: number
  tac: number
  effectiveTermMonths: number
  incomeCommitmentPercent: number
  firstInstallmentBreakdown: {
    amortization: number
    interest: number
    mip: number
    dfi: number
    tac: number
  }
}

export interface BankSimulationResult {
  bankId: string
  bankCode: string
  bankName: string
  modality: FinancingModality
  rateAnnual: number
  sac: { firstInstallment: number; lastInstallment: number; totalInterest: number; totalCost: number }
  price?: { fixedInstallment: number; totalInterest: number; totalCost: number }
  caixaMcmv?: CaixaMcmvBreakdown
}

export interface SimulationOutput {
  simulationId: string
  financedAmount: number
  termMonths: number
  results: BankSimulationResult[]
  fipeValue?: number
  fipeLtv?: number
  marketBaseRateAnnual?: number
}

export class CreateSimulationUseCase {
  private readonly sacCalculator = new SacCalculatorService()
  private readonly priceCalculator = new PriceCalculatorService()
  private readonly marketRates = new MarketRatesService()
  private readonly fipe = new FipeService()
  private readonly caixaMcmvCalculator = new CaixaMcmvCalculatorService()

  constructor(
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly cache: CacheProvider,
    private readonly wsHub?: WebSocketHub,
  ) {}

  async execute(input: SimulationInput): Promise<SimulationOutput> {
    const log = logger.child('CreateSimulation', input.financingType)
    const whatsappNumber = input.whatsappNumber ?? 'internal'
    const financedAmount = input.requestedAmount - input.downPaymentAmount - (input.fgtsAmount ?? 0)

    log.info('Iniciando simulação', { whatsappNumber, requestedAmount: input.requestedAmount, financedAmount })

    if (financedAmount <= 0) {
      throw new Error('Valor financiado deve ser maior que zero')
    }

    // Busca/atualiza taxas
    const openFinanceProvider = new BcbOlindaProviderImplementation()
    const fetchRatesUseCase = new FetchAndCacheBankRatesUseCase(this.db, this.cache, openFinanceProvider)
    await fetchRatesUseCase.execute(input.financingType)
    log.debug('Taxas atualizadas')

    // Obtém taxas por modalidade
    const modalities = MODALITY_BY_TYPE[input.financingType] ?? ['SFH']
    const getRatesUseCase = new GetBankRatesUseCase(this.db, this.cache)

    const allRates = (
      await Promise.all(modalities.map((m) => getRatesUseCase.execute(m)))
    ).flat()

    log.info('Taxas obtidas', { modalitiesCount: modalities.length, ratesFound: allRates.length })

    if (allRates.length === 0) {
      log.error('Nenhuma taxa encontrada para as modalidades', {
        modalities,
        financingType: input.financingType,
        reason: 'Nenhum banco tem taxa para estas modalidades no banco de dados. Executar seed ou aguardar atualização de taxas.',
      })
    }

    // Busca taxa de mercado real (BCB SGS) e valor FIPE para veículos
    let fipeValue: number | undefined
    let fipeLtv: number | undefined
    let marketBaseRateAnnual: number | undefined

    if (input.financingType === 'veiculo') {
      const [mktRates, fipeResult] = await Promise.allSettled([
        this.marketRates.getRates(),
        this.lookupFipe(input),
      ])

      if (mktRates.status === 'fulfilled') {
        marketBaseRateAnnual = mktRates.value.cdcVehiclePfAnnual
        log.info('Taxa mercado CDC veículos', { baseRateAnnual: marketBaseRateAnnual })
      }

      if (fipeResult.status === 'fulfilled' && fipeResult.value) {
        fipeValue = fipeResult.value
        fipeLtv = this.fipe.calcLtv(financedAmount, fipeValue)
        log.info('FIPE obtida', { fipeValue, fipeLtv, financedAmount })
      }
    }

    // Base rate: usa BCB SGS quando disponível, senão usa taxa do banco do DB
    // Spread de risco: idade do veículo + LTV real (FIPE) + comprometimento de renda
    const referenceRateAnnual = marketBaseRateAnnual !== undefined
      ? marketBaseRateAnnual / 100
      : 0.56 // fallback: média CDC veículos ~56% a.a.
    const vehicleRiskSpread = input.financingType === 'veiculo'
      ? this.calcVehicleRiskSpread(input, fipeLtv, { financedAmount, referenceRateAnnual })
      : 0

    // Quando Caixa MCMV pode ser calculado localmente, remove Caixa do pool Open Finance
    // para evitar duplicata — o resultado MCMV é mais preciso que taxas genéricas do BCB
    const familyMonthlyIncome = (input.monthlyIncome ?? 0) + (input.coParticipantIncome ?? 0)
    const canRunCaixaMcmv = (
      input.financingType === 'imobiliario' &&
      input.applicantAgeYears !== undefined &&
      input.propertyValue !== undefined &&
      familyMonthlyIncome > 0
    )
    if (canRunCaixaMcmv) {
      for (const key of allRates.filter((r) => r.bankCode === 'CAIXA').map((r) => r.bankCode)) {
        log.debug('Removendo Caixa do pool Open Finance: será calculado via MCMV local', { bankCode: key })
      }
    }

    // Agrupa por banco: pega a menor taxa por banco, aplicando base + spread
    const bestRateByBank = new Map<string, typeof allRates[0]>()
    for (const rate of allRates) {
      if (canRunCaixaMcmv && rate.bankCode === 'CAIXA') continue

      // Usa a taxa real do banco do DB se for realista (BCB OLINDA já corrigido),
      // caso contrário usa mercado BCB SGS ± diferencial por banco
      const bankDiff = BANK_MARKET_DIFFERENTIAL[rate.bankCode] ?? 0
      const isVehicle = input.financingType === 'veiculo'
      const rateIsRealistic = !isVehicle || rate.rateAnnual >= MIN_REALISTIC_VEHICLE_RATE
      const effectiveBase = (rateIsRealistic || marketBaseRateAnnual === undefined)
        ? rate.rateAnnual
        : (marketBaseRateAnnual / 100) + bankDiff
      const effectiveRate = effectiveBase + vehicleRiskSpread

      const adjustedRate = { ...rate, rateAnnual: effectiveRate }
      const existing = bestRateByBank.get(rate.bankCode)
      if (!existing || adjustedRate.rateAnnual < existing.rateAnnual) {
        bestRateByBank.set(rate.bankCode, adjustedRate)
      }
    }

    log.info('Bancos agrupados', { banksCount: bestRateByBank.size, vehicleRiskSpread, marketBaseRateAnnual })

    // Persiste simulação
    const [simulation] = await this.db
      .insert(schema.financingSimulations)
      .values({
        clientId:       input.clientId ?? null,
        whatsappNumber,
        financingType:  input.financingType as schema.NewFinancingSimulation['financingType'],
        requestedAmount:   input.requestedAmount.toFixed(2),
        downPaymentAmount: input.downPaymentAmount.toFixed(2),
        financedAmount:    financedAmount.toFixed(2),
        termMonths:        input.termMonths,
        // Imobiliário
        realEstateObjective: (input.realEstateObjective as schema.NewFinancingSimulation['realEstateObjective']) ?? null,
        purchaseTimeline:    (input.purchaseTimeline    as schema.NewFinancingSimulation['purchaseTimeline'])    ?? null,
        includeFees:         input.includeFees ?? null,
        propertyValue:       input.propertyValue?.toFixed(2) ?? null,
        propertyType:        (input.propertyType as schema.NewFinancingSimulation['propertyType']) ?? null,
        propertyCity:        input.propertyCity  ?? null,
        propertyState:       input.propertyState ?? null,
        fgtsAmount:          (input.fgtsAmount ?? 0).toFixed(2),
        // Veículo
        vehicleType:    (input.vehicleType    as schema.NewFinancingSimulation['vehicleType'])    ?? null,
        vehicleBrand:   input.vehicleBrand    ?? null,
        vehicleModel:   input.vehicleModel    ?? null,
        vehicleYear:    input.vehicleYear     ?? null,
        vehicleFuel:    (input.vehicleFuel    as schema.NewFinancingSimulation['vehicleFuel'])    ?? null,
        sellerContext:  (input.sellerContext  as schema.NewFinancingSimulation['sellerContext'])  ?? null,
        purchaseIntent: (input.purchaseIntent as schema.NewFinancingSimulation['purchaseIntent']) ?? null,
        hasCnh:         input.hasCnh         ?? null,
        residenceState: input.residenceState  ?? null,
        // Pessoal / Consignado
        employmentType: (input.employmentType as schema.NewFinancingSimulation['employmentType']) ?? null,
        employer:       input.employer    ?? null,
        loanPurpose:    input.loanPurpose ?? null,
        metadata:       input.metadata ?? {},
      })
      .returning()

    if (!simulation) throw new Error('Falha ao criar simulação')

    // Cria lead automaticamente quando a simulação vem do WhatsApp bot
    if (whatsappNumber !== 'internal') {
      const clientId = input.clientId ?? (
        await this.db
          .select({ id: schema.financingClients.id })
          .from(schema.financingClients)
          .where(eq(schema.financingClients.whatsappNumber, whatsappNumber))
          .limit(1)
          .then((rows) => rows[0]?.id ?? null)
      )
      if (clientId) {
        await this.db.insert(schema.leads).values({
          clientId,
          simulationId: simulation.id,
          whatsappNumber,
          status:       'new',
        })
      }
    }

    // Calcula e persiste resultados por banco
    const results: BankSimulationResult[] = []
    const resultValues: schema.NewSimulationResult[] = []

    for (const rate of bestRateByBank.values()) {
      const sacResult = this.sacCalculator.calculate({
        financedAmount,
        annualRate: rate.rateAnnual,
        termMonths: input.termMonths,
      })
      const priceResult = this.priceCalculator.calculate({
        financedAmount,
        annualRate: rate.rateAnnual,
        termMonths: input.termMonths,
      })

      results.push({
        bankId: rate.bankId,
        bankCode: rate.bankCode,
        bankName: rate.bankName,
        modality: rate.modality,
        rateAnnual: rate.rateAnnual,
        sac: {
          firstInstallment: sacResult.firstInstallment,
          lastInstallment: sacResult.lastInstallment,
          totalInterest: sacResult.totalInterest,
          totalCost: sacResult.totalCost,
        },
        price: {
          fixedInstallment: priceResult.fixedInstallment,
          totalInterest: priceResult.totalInterest,
          totalCost: priceResult.totalCost,
        },
      })

      resultValues.push(
        {
          simulationId: simulation.id,
          bankId: rate.bankId,
          amortizationSystem: 'SAC',
          firstInstallment: sacResult.firstInstallment.toFixed(2),
          lastInstallment: sacResult.lastInstallment.toFixed(2),
          totalInterest: sacResult.totalInterest.toFixed(2),
          totalCost: sacResult.totalCost.toFixed(2),
        },
        {
          simulationId:       simulation.id,
          bankId:             rate.bankId,
          amortizationSystem: 'PRICE',
          firstInstallment:   priceResult.fixedInstallment.toFixed(2),
          fixedInstallment:   priceResult.fixedInstallment.toFixed(2),
          totalInterest:      priceResult.totalInterest.toFixed(2),
          totalCost:          priceResult.totalCost.toFixed(2),
        },
      )
    }

    // Caixa MCMV: cálculo local com parâmetros do bundle Angular (ADR-006)
    if (canRunCaixaMcmv) {
      try {
        const [caixaBank] = await this.db
          .select()
          .from(schema.banks)
          .where(eq(schema.banks.code, 'CAIXA'))

        if (caixaBank) {
          const caixaMcmvResult = this.caixaMcmvCalculator.calculate({
            propertyValue: input.propertyValue!,
            financedAmount,
            termMonths: input.termMonths,
            familyMonthlyIncome,
            applicantAgeYears: input.applicantAgeYears!,
          })

          results.push({
            bankId: caixaBank.id,
            bankCode: 'CAIXA',
            bankName: caixaBank.name,
            modality: 'MCMV',
            rateAnnual: caixaMcmvResult.annualRate,
            sac: {
              firstInstallment: caixaMcmvResult.firstInstallment,
              lastInstallment: caixaMcmvResult.lastInstallment,
              totalInterest: caixaMcmvResult.totalInterest,
              totalCost: caixaMcmvResult.totalCost,
            },
            caixaMcmv: {
              mcmvFaixa: caixaMcmvResult.mcmvFaixa,
              totalMip: caixaMcmvResult.totalMip,
              totalDfi: caixaMcmvResult.totalDfi,
              tac: caixaMcmvResult.tac,
              effectiveTermMonths: caixaMcmvResult.effectiveTermMonths,
              incomeCommitmentPercent: caixaMcmvResult.incomeCommitmentPercent,
              firstInstallmentBreakdown: caixaMcmvResult.firstInstallmentBreakdown,
            },
          })

          resultValues.push({
            simulationId: simulation.id,
            bankId: caixaBank.id,
            amortizationSystem: 'SAC',
            firstInstallment: caixaMcmvResult.firstInstallment.toFixed(2),
            lastInstallment: caixaMcmvResult.lastInstallment.toFixed(2),
            totalInterest: caixaMcmvResult.totalInterest.toFixed(2),
            totalCost: caixaMcmvResult.totalCost.toFixed(2),
          })

          log.info('Caixa MCMV calculado', {
            mcmvFaixa: caixaMcmvResult.mcmvFaixa,
            annualRate: caixaMcmvResult.annualRate,
            firstInstallment: caixaMcmvResult.firstInstallment,
            effectiveTermMonths: caixaMcmvResult.effectiveTermMonths,
          })
        } else {
          log.warn('Banco Caixa não encontrado no banco de dados (code=CAIXA) — resultado MCMV omitido')
        }
      } catch (caixaError) {
        log.warn('Falha no cálculo Caixa MCMV — resultado omitido', {
          reason: caixaError instanceof Error ? caixaError.message : String(caixaError),
        })
      }
    }

    if (resultValues.length > 0) {
      await this.db.insert(schema.simulationResults).values(resultValues)
    }

    // Ordena por menor parcela SAC
    results.sort((a, b) => a.sac.firstInstallment - b.sac.firstInstallment)

    // Filtra bancos permitidos (SIMULATION_ALLOWED_BANKS=CAIXA,BB — vazio = todos)
    const allowedBanksRaw = process.env.SIMULATION_ALLOWED_BANKS ?? ''
    const allowedBanks = allowedBanksRaw
      .split(',')
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean)
    const filteredResults = allowedBanks.length > 0
      ? results.filter((result) => allowedBanks.includes(result.bankCode.toUpperCase()))
      : results

    log.info('Simulação concluída', {
      simulationId: simulation.id,
      resultsCount: filteredResults.length,
      vehicleRiskSpread: input.financingType === 'veiculo'
        ? this.calcVehicleRiskSpread(input)
        : undefined,
    })

    if (this.wsHub) {
      await this.wsHub.publishBroadcast('global', WS_EVENTS.SIMULATION_COMPLETED, {
        simulationId: simulation.id,
        whatsappNumber: input.whatsappNumber,
        banksCompared: filteredResults.length,
      })
    }

    return { simulationId: simulation.id, financedAmount, termMonths: input.termMonths, results: filteredResults, fipeValue, fipeLtv, marketBaseRateAnnual }
  }

  // Lookup FIPE: tenta encontrar o valor de mercado do veículo
  private async lookupFipe(input: SimulationInput): Promise<number | null> {
    if (!input.vehicleBrand || !input.vehicleModel || !input.vehicleYear) return null
    const log = logger.child('lookupFipe')
    try {
      const brands = await this.fipe.searchBrands(input.vehicleBrand)
      log.info('FIPE marcas encontradas', { count: brands.length, first: brands[0]?.nome })
      if (brands.length === 0) return null

      const brandCode = brands[0]!.codigo
      const models = await this.fipe.searchModels(brandCode, input.vehicleModel)
      log.info('FIPE modelos encontrados', { count: models.length, first: models[0]?.nome })
      if (models.length === 0) return null

      const fuelCode = input.vehicleFuel?.toLowerCase().includes('diesel') ? 'D'
        : input.vehicleFuel?.toLowerCase().includes('etanol') ? 'E'
        : 'G'
      const targetFuelPart = fuelCode === 'G' ? '1' : fuelCode === 'E' ? '2' : '3'
      const targetYear = String(input.vehicleYear)

      // Vários modelos podem casar com o texto (ex: "ASX 2.0" casa com versões blindadas,
      // 4x4, etc.). Itera os candidatos e escolhe o primeiro que tenha o ANO solicitado —
      // evita pegar uma variante que não cobre o ano do veículo do cliente.
      for (const model of models) {
        const modelCode = String(model.codigo)
        const availableYears = await this.fipe.listYears(brandCode, modelCode)
        const yearEntry = availableYears.find((y) => {
          const [yearPart, fuelPart] = y.codigo.split('-')
          return yearPart === targetYear && fuelPart === targetFuelPart
        }) ?? availableYears.find((y) => y.codigo.startsWith(targetYear))

        if (!yearEntry) continue

        const result = await this.fipe.getVehicleValueByYearCode(brandCode, modelCode, yearEntry.codigo)
        if (result?.value) {
          log.info('FIPE valor obtido', { fipeValue: result.value, model: result.model, yearCode: yearEntry.codigo })
          return result.value
        }
      }

      log.warn('FIPE: nenhum modelo candidato cobre o ano solicitado', {
        year: targetYear,
        candidates: models.slice(0, 5).map((m) => m.nome),
      })
      return null
    } catch (err) {
      logger.warn('Falha ao consultar FIPE', { err })
      return null
    }
  }

  // Prêmio de risco sobre a taxa base de mercado (decimal, ex: 0.02 = +2% a.a.).
  // A média BCB SGS já embute o risco típico de carteira (carros usados, LTV alto, vários
  // perfis), então o prêmio aqui é só o EXCESSO de risco deste contrato sobre a média — mantido
  // pequeno de propósito. Calibrado p/ que o resultado fique próximo de simulações reais.
  private calcVehicleRiskSpread(
    input: SimulationInput,
    fipeLtv?: number,
    affordability?: { financedAmount: number; referenceRateAnnual: number },
  ): number {
    let spread = 0

    // Risco por idade: veículos mais antigos têm depreciação acelerada como garantia
    const currentYear = new Date().getFullYear()
    const vehicleAge = input.vehicleYear ? currentYear - input.vehicleYear : 0
    if (vehicleAge >= 10) spread += 0.015       // +1.5% a.a. para 10+ anos
    else if (vehicleAge >= 5) spread += 0.008   // +0.8% a.a. para 5-9 anos
    else if (vehicleAge >= 2) spread += 0.003   // +0.3% a.a. para 2-4 anos

    // Comprometimento de renda (DTI): proxy de capacidade de pagamento, custo zero.
    // Estima a parcela PRICE com a taxa de referência e compara com a renda declarada.
    // Não há circularidade: usa a taxa BASE (antes do spread) só para estimar a parcela.
    const totalIncome = (input.monthlyIncome ?? 0) + (input.coParticipantIncome ?? 0)
    if (totalIncome > 0 && affordability && affordability.financedAmount > 0 && input.termMonths > 0) {
      const i = Math.pow(1 + affordability.referenceRateAnnual, 1 / 12) - 1
      const n = input.termMonths
      const estInstallment = i > 0
        ? (affordability.financedAmount * i) / (1 - Math.pow(1 + i, -n))
        : affordability.financedAmount / n
      const dti = estInstallment / totalIncome
      if (dti > 0.5) spread += 0.04             // > 50% da renda: risco muito alto
      else if (dti > 0.4) spread += 0.025       // 40-50%
      else if (dti > 0.3) spread += 0.012       // 30-40% (acima do saudável)
      else if (dti <= 0.15) spread -= 0.01      // folga grande: pequeno desconto de risco
    }

    // TODO:mensagem — INTEGRAÇÃO FUTURA DE SCORE DE CRÉDITO.
    // Hoje usamos só o comprometimento de renda (acima) como proxy de capacidade, pois NÃO existe
    // API pública gratuita de score de terceiros. Caminhos futuros, quando houver orçamento/cadastro:
    //   • Serasa Experian / Boa Vista (Equifax) / SPC Brasil / Quod — APIs B2B pagas (contrato + CNPJ).
    //   • Open Finance (consentido) — exige ser participante regulado pelo BCB; dá acesso a dados
    //     financeiros reais do cliente (não um score pronto, mas insumo para calculá-lo).
    //   • Score auto-declarado: perguntar a faixa do score Serasa (grátis no app do cliente) e
    //     ajustar o spread por faixa (0-300 / 300-500 / 500-700 / 700-1000).
    // Ao integrar, aplicar o ajuste aqui, somando/subtraindo do `spread` conforme a faixa de risco.

    // TODO:mensagem — verificar histórico do veículo (DETRAN/Renavam) para ajustar risco por
    // multas, restrições, sinistros, recall. APIs como Belissimo ou Datainfo são pagas.

    // LTV via FIPE (mais preciso) ou via entrada declarada
    const ltv = fipeLtv !== undefined
      ? fipeLtv
      : input.requestedAmount > 0
        ? (input.requestedAmount - input.downPaymentAmount) / input.requestedAmount
        : 1

    if (ltv > 1.0) spread += 0.03              // +3% a.a. acima do valor FIPE (alto risco)
    else if (ltv >= 0.9) spread += 0.015       // +1.5% a.a. LTV 90-100%
    else if (ltv >= 0.8) spread += 0.005       // +0.5% a.a. LTV 80-90%

    // TODO:mensagem — bancos têm políticas de LTV máximo por ano de fabricação do veículo.
    // Ex: veículo 2014 pode ter LTV máximo de 80% em alguns bancos. Sem acesso à API de cada
    // banco, não conseguimos refletir isso. A CAIXA, por exemplo, não atua fortemente em CDC
    // de veículos usados particulares — seu foco é veículos novos e convênios.

    // TODO:mensagem — desconto por relacionamento (ex: Santander deu R$ 1.199 de isenção de
    // cadastro para cliente existente). Impossível calcular sem acesso às APIs proprietárias
    // de cada banco. Informar ao usuário que a taxa real pode ser menor se já for correntista.

    return spread
  }
}
