export const dashboard = {
  title:    'Dashboard Geral',
  subtitle: 'Visão consolidada em tempo real',
  stats: {
    leadsToday:    'Leads Hoje',
    activeClients: 'Clientes Ativos',
    simulationsToday: 'Simulações Hoje',
    activeSessions:'Sessões Ativas',
    botAttendance: 'bot em atendimento',
    total:         (n: number) => `${n} total`,
    newToday:      (n: number) => `+${n} hoje`,
  },
  charts: {
    leadsByStatus:           'Leads por Status',
    sessionsByState:         'Sessões por Estado',
    simulationsByModality:   'Simulações por Modalidade',
    weekly:                  'Resumo da Semana',
  },
  financingLabels: {
    imobiliario: 'Imóvel',
    veiculo:     'Veículo',
    pessoal:     'Pessoal',
    consignado:  'Consignado',
    empresa:     'Empresa',
    equipamento: 'Equipamento',
    rural:       'Rural',
  },
} as const
