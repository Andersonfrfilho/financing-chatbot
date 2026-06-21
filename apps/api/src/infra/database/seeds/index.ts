import { db } from '../connection'
import * as schema from '../schema'
import * as argon2 from 'argon2'

async function seed() {
  console.log('[Seed] Starting...')

  // Roles
  const [adminRole] = await db
    .insert(schema.roles)
    .values({
      name: 'admin',
      description: 'Administrador do sistema',
      permissions: [
        { resource: '*', action: '*' },
      ],
    })
    .onConflictDoNothing()
    .returning()

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

  // Admin user
  if (adminRole) {
    const passwordHash = await argon2.hash('admin@123')
    await db.insert(schema.users).values({
      roleId: adminRole.id,
      name: 'Administrador',
      email: 'admin@financiamento.bot',
      passwordHash,
      passwordMustChange: true,
    }).onConflictDoNothing()
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
  process.exit(0)
}

seed().catch((error) => {
  console.error('[Seed] Failed:', error)
  process.exit(1)
})
