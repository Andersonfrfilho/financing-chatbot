import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core'
import { categories } from './categories'
import { catalogSyncStatusEnum, productAvailabilityEnum, productConditionEnum } from './enums'

export const products = pgTable('products', {
  id:         uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),

  retailerId:   varchar('retailer_id', { length: 255 }).notNull().unique(),
  name:         varchar('name', { length: 255 }).notNull(),
  description:  text('description'),
  priceInCents: integer('price_in_cents').notNull(),
  currency:     varchar('currency', { length: 3 }).default('BRL').notNull(),
  imageUrl:     varchar('image_url', { length: 500 }),
  active:       boolean('active').default(true).notNull(),

  availability: productAvailabilityEnum('availability').default('in stock').notNull(),
  condition:    productConditionEnum('condition').default('new').notNull(),

  // ── Sincronização com o Catálogo do WhatsApp (Meta Product) ──
  externalId: varchar('external_id', { length: 255 }),
  syncStatus: catalogSyncStatusEnum('sync_status').default('pending').notNull(),
  syncError:  text('sync_error'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type Product    = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
