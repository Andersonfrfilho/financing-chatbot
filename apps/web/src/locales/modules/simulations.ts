export const simulations = {
  title:    'Simulações',
  subtitle: (total: number) => `${total} simulações realizadas`,
  empty:    'Nenhuma simulação encontrada',
  columns: {
    whatsapp:        'WhatsApp',
    product:         'Produto',
    clientName:      'Cliente',
    modality:        'Modalidade',
    propertyValue:   'Valor Imóvel',
    financed:        'Financiado',
    downPayment:     'Entrada',
    term:            'Prazo',
    banks:           'Bancos',
    bestInstallment: 'Melhor 1ª Parcela',
    income:          'Renda',
    createdAt:       'Data',
    actions:         'Ações',
  },
  detail: {
    title: 'Detalhes da Simulação',
  },
} as const
