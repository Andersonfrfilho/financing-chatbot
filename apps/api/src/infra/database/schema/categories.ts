import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { catalogSyncStatusEnum } from './enums'

export const categories = pgTable('categories', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  active:      boolean('active').default(true).notNull(),
  catalogId:   varchar('catalog_id', { length: 255 }),

  // ── Sincronização com o Catálogo do WhatsApp (Meta Product Set) ──
  externalId: varchar('external_id', { length: 255 }),
  syncStatus: catalogSyncStatusEnum('sync_status').default('pending').notNull(),
  syncError:  text('sync_error'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type Category    = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
