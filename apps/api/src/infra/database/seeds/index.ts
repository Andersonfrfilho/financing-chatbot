import { eq } from 'drizzle-orm'
import { db } from '../connection'
import * as schema from '../schema'
import { hash } from '@node-rs/argon2'

export async function seedDatabase() {
  console.log('[Seed] Starting...')

  // Roles
  await db
    .insert(schema.roles)
    .values({
      name: 'admin',
      description: 'Administrador do sistema',
      permissions: [
        { resource: '*', action: '*' },
      ],
    })
    .onConflictDoNothing()

  await db.insert(schema.roles).values([
    {
      name: 'comercial',
      description: 'Equipe comercial — gerencia leads e propostas',
      permissions: [
        { resource: 'leads', action: 'read' },
        { resource: 'leads', action: 'update' },
        { resource: 'clients', action: 'read' },
        { resource: 'simulations', action: 'read' },
      ],
    },
    {
      name: 'atendimento',
      description: 'Atendimento — visualiza conversas e clientes',
      permissions: [
        { resource: 'clients', action: 'read' },
        { resource: 'leads', action: 'read' },
        { resource: 'simulations', action: 'read' },
      ],
    },
  ]).onConflictDoNothing()

  // Admin user (busca role criado/existente)
  const adminRole = await db.query.roles.findFirst({
    where: eq(schema.roles.name, 'admin'),
  })
  if (adminRole) {
    const passwordHash = await hash('admin@123')
    const [created] = await db.insert(schema.users).values({
      roleId: adminRole.id,
      name: 'Administrador',
      email: 'admin@financiamento.bot',
      passwordHash,
      active: true,
      passwordMustChange: true,
    }).onConflictDoNothing().returning()
    console.log(`[Seed] Admin user: ${created ? 'created' : 'already exists'}`)
  } else {
    console.log('[Seed] Admin role not found!')
  }

  // Banks
  await db.insert(schema.banks).values([
    {
      name: 'Caixa Econômica Federal',
      code: 'CAIXA',
      openFinanceBaseUrl: 'https://opendata.api.caixa.gov.br',
      active: true,
    },
    {
      name: 'Santander',
      code: 'SANTANDER',
      openFinanceBaseUrl: 'https://openbanking.santander.com.br',
      active: true,
    },
    {
      name: 'Banco do Brasil',
      code: 'BB',
      openFinanceBaseUrl: 'https://opendata.api.bb.com.br',
      active: true,
    },
    {
      name: 'Itaú',
      code: 'ITAU',
      openFinanceBaseUrl: 'https://secure.api.itau/openbanking',
      active: true,
    },
    {
      name: 'Bradesco',
      code: 'BRADESCO',
      openFinanceBaseUrl: 'https://proxy.api.prebanco.com.br',
      active: true,
    },
  ]).onConflictDoNothing()

  console.log('[Seed] Done.')
}

// Executar diretamente se chamado como script
if (process.argv[1]?.endsWith('seeds/index.ts')) {
  seedDatabase()
    .catch((error) => {
      console.error('[Seed] Failed:', error)
      process.exit(1)
    })
    .finally(() => process.exit(0))
}
