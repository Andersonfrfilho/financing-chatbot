import { relations } from 'drizzle-orm'
import { users } from './users'
import { roles } from './roles'
import { financingClients } from './financing-clients'
import { financingSimulations } from './financing-simulations'
import { simulationResults } from './simulation-results'
import { banks } from './banks'
import { bankRates } from './bank-rates'
import { leads } from './leads'

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  assignedLeads: many(leads),
}))

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}))

export const financingClientsRelations = relations(financingClients, ({ many }) => ({
  simulations: many(financingSimulations),
  leads: many(leads),
}))

export const financingSimulationsRelations = relations(financingSimulations, ({ one, many }) => ({
  client: one(financingClients, { fields: [financingSimulations.clientId], references: [financingClients.id] }),
  results: many(simulationResults),
  lead: one(leads),
}))

export const simulationResultsRelations = relations(simulationResults, ({ one }) => ({
  simulation: one(financingSimulations, { fields: [simulationResults.simulationId], references: [financingSimulations.id] }),
  bank: one(banks, { fields: [simulationResults.bankId], references: [banks.id] }),
  bankRate: one(bankRates, { fields: [simulationResults.bankRateId], references: [bankRates.id] }),
}))

export const banksRelations = relations(banks, ({ many }) => ({
  rates: many(bankRates),
  simulationResults: many(simulationResults),
}))

export const bankRatesRelations = relations(bankRates, ({ one }) => ({
  bank: one(banks, { fields: [bankRates.bankId], references: [banks.id] }),
}))

export const leadsRelations = relations(leads, ({ one }) => ({
  client: one(financingClients, { fields: [leads.clientId], references: [financingClients.id] }),
  simulation: one(financingSimulations, { fields: [leads.simulationId], references: [financingSimulations.id] }),
  assignedUser: one(users, { fields: [leads.assignedTo], references: [users.id] }),
}))
