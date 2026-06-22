import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { CacheProvider } from '@/shared/providers/CacheProvider'
import type { WebSocketHub } from '@/infra/websocket/WebSocketHub'
import { WS_EVENTS } from '@/infra/websocket/WebSocketEvents'
import { logger } from '@/shared/logger'
import { SacCalculatorService } from '../services/SacCalculatorService'
import { PriceCalculatorService } from '../services/PriceCalculatorService'
import { MarketRatesService } from '../services/MarketRatesService'
import { FipeService } from '../services/FipeService'
import { GetBankRatesUseCase } from '@/modules/open-finance/application/use-cases/GetBankRatesUseCase'
import { FetchAndCacheBankRatesUseCase } from '@/modules/open-finance/application/use-cases/FetchAndCacheBankRatesUseCase'
import { BcbOlindaProviderImplementation } from '@/modules/open-finance/infra/providers/BcbOlindaProviderImplementation'
import type { FinancingModality } from '@/shared/types'
import * as schema from '@/infra/database/schema'

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
  // Extra
  metadata?: Record<string, unknown>
}

export interface BankSimulationResult {
  bankId: string
  bankCode: string
  bankName: string
  modality: FinancingModality
  rateAnnual: number
  sac: { firstInstallment: number; lastInstallment: number; totalInterest: number; totalCost: number }
  price: { fixedInstallment: number; totalInterest: number; totalCost: number }
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
    // Spread de risco: idade do veículo + LTV real (calculado via FIPE)
    const vehicleRiskSpread = input.financingType === 'veiculo'
      ? this.calcVehicleRiskSpread(input, fipeLtv)
      : 0

    // Agrupa por banco: pega a menor taxa por banco, aplicando base + spread
    const bestRateByBank = new Map<string, typeof allRates[0]>()
    for (const rate of allRates) {
      // Se temos taxa de mercado real, substitui a taxa do banco pelo mercado + spread
      const effectiveRate = marketBaseRateAnnual !== undefined
        ? (marketBaseRateAnnual / 100) + vehicleRiskSpread
        : rate.rateAnnual + vehicleRiskSpread

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

    if (resultValues.length > 0) {
      await this.db.insert(schema.simulationResults).values(resultValues)
    }

    // Ordena por menor parcela SAC
    results.sort((a, b) => a.sac.firstInstallment - b.sac.firstInstallment)

    log.info('Simulação concluída', {
      simulationId: simulation.id,
      resultsCount: results.length,
      vehicleRiskSpread: input.financingType === 'veiculo'
        ? this.calcVehicleRiskSpread(input)
        : undefined,
    })

    if (this.wsHub) {
      await this.wsHub.publishBroadcast('global', WS_EVENTS.SIMULATION_COMPLETED, {
        simulationId: simulation.id,
        whatsappNumber: input.whatsappNumber,
        banksCompared: results.length,
      })
    }

    return { simulationId: simulation.id, financedAmount, termMonths: input.termMonths, results, fipeValue, fipeLtv, marketBaseRateAnnual }
  }

  // Lookup FIPE: tenta encontrar o valor de mercado do veículo
  private async lookupFipe(input: SimulationInput): Promise<number | null> {
    if (!input.vehicleBrand || !input.vehicleModel || !input.vehicleYear) return null
    try {
      const brands = await this.fipe.searchBrands(input.vehicleBrand)
      if (brands.length === 0) return null

      const brandCode = brands[0]!.codigo
      const models = await this.fipe.searchModels(brandCode, input.vehicleModel)
      if (models.length === 0) return null

      const modelCode = String(models[0]!.codigo)
      const fuelCode = input.vehicleFuel?.toLowerCase().includes('diesel') ? 'D'
        : input.vehicleFuel?.toLowerCase().includes('etanol') ? 'E'
        : 'G'

      const result = await this.fipe.getVehicleValue(brandCode, modelCode, input.vehicleYear, fuelCode)
      return result?.value ?? null
    } catch {
      return null
    }
  }

  // Spread adicional sobre a taxa base de mercado (em decimal, ex: 0.05 = +5% a.a.)
  private calcVehicleRiskSpread(input: SimulationInput, fipeLtv?: number): number {
    let spread = 0

    // Risco por idade: veículos mais antigos têm depreciação acelerada como garantia
    const currentYear = new Date().getFullYear()
    const vehicleAge = input.vehicleYear ? currentYear - input.vehicleYear : 0
    if (vehicleAge >= 10) spread += 0.05        // +5% a.a. para 10+ anos
    else if (vehicleAge >= 5) spread += 0.025   // +2.5% a.a. para 5-9 anos
    else if (vehicleAge >= 2) spread += 0.01    // +1% a.a. para 2-4 anos

    // LTV via FIPE (mais preciso) ou via entrada declarada
    const ltv = fipeLtv !== undefined
      ? fipeLtv
      : input.requestedAmount > 0
        ? (input.requestedAmount - input.downPaymentAmount) / input.requestedAmount
        : 1

    if (ltv > 1.0) spread += 0.08              // +8% a.a. acima do valor FIPE (alto risco)
    else if (ltv >= 0.9) spread += 0.04        // +4% a.a. LTV 90-100%
    else if (ltv >= 0.8) spread += 0.02        // +2% a.a. LTV 80-90%

    return spread
  }
}
