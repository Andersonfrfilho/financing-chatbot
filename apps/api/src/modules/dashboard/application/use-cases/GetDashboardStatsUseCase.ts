import { sql } from 'drizzle-orm'
import { db } from '@/infra/database/connection'
import { leads, financingClients, financingSimulations, conversationSessions } from '@/infra/database/schema'

export type DashboardStats = {
  leads: {
    total: number
    byStatus: Record<string, number>
    newToday: number
    newThisWeek: number
  }
  clients: {
    total: number
    newToday: number
    newThisWeek: number
  }
  simulations: {
    total: number
    byFinancingType: Record<string, number>
    todayTotal: number
  }
  sessions: {
    active: number
    byState: Record<string, number>
  }
}

export class GetDashboardStatsUseCase {
  async execute(): Promise<DashboardStats> {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)

    const [
      leadsTotal,
      leadsByStatus,
      leadsToday,
      leadsWeek,
      clientsTotal,
      clientsToday,
      clientsWeek,
      simulationsTotal,
      simulationsByType,
      simulationsToday,
      sessionsByState,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(leads),
      db.select({ status: leads.status, count: sql<number>`count(*)` }).from(leads).groupBy(leads.status),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(sql`created_at >= ${todayStart}`),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(sql`created_at >= ${weekStart}`),
      db.select({ count: sql<number>`count(*)` }).from(financingClients).where(sql`deleted_at IS NULL`),
      db.select({ count: sql<number>`count(*)` }).from(financingClients).where(sql`created_at >= ${todayStart} AND deleted_at IS NULL`),
      db.select({ count: sql<number>`count(*)` }).from(financingClients).where(sql`created_at >= ${weekStart} AND deleted_at IS NULL`),
      db.select({ count: sql<number>`count(*)` }).from(financingSimulations),
      db.select({ financingType: financingSimulations.financingType, count: sql<number>`count(*)` }).from(financingSimulations).groupBy(financingSimulations.financingType),
      db.select({ count: sql<number>`count(*)` }).from(financingSimulations).where(sql`created_at >= ${todayStart}`),
      db.select({ state: conversationSessions.currentState, count: sql<number>`count(*)` }).from(conversationSessions).groupBy(conversationSessions.currentState),
    ])

    const activeSessionStates = ['awaiting_financing_type','awaiting_name','awaiting_cpf','awaiting_birth_date','awaiting_civil_status','awaiting_email','awaiting_city','awaiting_state','awaiting_monthly_income','awaiting_family_income','awaiting_fgts','awaiting_fgts_amount','awaiting_down_payment','awaiting_down_payment_amount','awaiting_property_value','awaiting_property_type','awaiting_property_city','awaiting_property_state','awaiting_vehicle_type','awaiting_vehicle_value','awaiting_vehicle_year','awaiting_vehicle_down_payment','awaiting_loan_amount','awaiting_employment_type','awaiting_employer','awaiting_cnpj','awaiting_company_revenue','awaiting_term','simulation_ready']

    const sessionsByStateMap = Object.fromEntries(sessionsByState.map((s) => [s.state, Number(s.count)]))
    const activeSessions = Object.entries(sessionsByStateMap)
      .filter(([state]) => activeSessionStates.includes(state))
      .reduce((sum, [, count]) => sum + count, 0)

    return {
      leads: {
        total: Number(leadsTotal[0].count),
        byStatus: Object.fromEntries(leadsByStatus.map((r) => [r.status, Number(r.count)])),
        newToday: Number(leadsToday[0].count),
        newThisWeek: Number(leadsWeek[0].count),
      },
      clients: {
        total: Number(clientsTotal[0].count),
        newToday: Number(clientsToday[0].count),
        newThisWeek: Number(clientsWeek[0].count),
      },
      simulations: {
        total: Number(simulationsTotal[0].count),
        byFinancingType: Object.fromEntries(simulationsByType.map((r) => [r.financingType, Number(r.count)])),
        todayTotal: Number(simulationsToday[0].count),
      },
      sessions: {
        active: activeSessions,
        byState: sessionsByStateMap,
      },
    }
  }
}
