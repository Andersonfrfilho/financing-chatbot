export const simulations = {
  title:    'Simulações',
  subtitle: (total: number) => `${total} simulações realizadas`,
  empty:    'Nenhuma simulação encontrada',
  columns: {
    whatsapp:      'WhatsApp',
    product:       'Produto',
    propertyValue: 'Valor Imóvel',
    income:        'Renda',
    createdAt:     'Data',
    actions:       'Ações',
  },
  detail: {
    title: 'Detalhes da Simulação',
  },
} as const
