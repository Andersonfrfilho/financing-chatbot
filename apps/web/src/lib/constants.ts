export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export type BrazilianState = (typeof BRAZILIAN_STATES)[number]

// Mapeamento único de status de leads (chave = enum do banco)
export const LEAD_STATUSES: Record<string, { label: string; color: string }> = {
  new:           { label: 'Novo',              color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
  qualified:     { label: 'Qualificado',       color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400' },
  disqualified:  { label: 'Desqualificado',    color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
  negotiating:   { label: 'Em negociação',     color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400' },
  proposal_sent: { label: 'Proposta enviada',  color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400' },
  won:           { label: 'Ganho',             color: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' },
  lost:          { label: 'Perdido',           color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
} as const

// Mapeamento único de modalidades de financiamento
export const FINANCING_LABELS: Record<string, string> = {
  imobiliario:  'Imóvel',
  veiculo:      'Veículo',
  pessoal:      'Crédito Pessoal',
  consignado:   'Consignado',
  empresa:      'Empresarial',
  equipamento:  'Equipamento',
  rural:        'Rural',
  consorcio:    'Consórcio',
  imovel:       'Consórcio Imóvel',
  carro:        'Consórcio Carro',
  moto:         'Consórcio Moto',
  caminhao:     'Consórcio Caminhão',
} as const
