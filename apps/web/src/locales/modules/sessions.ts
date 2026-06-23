export const sessions = {
  title:    'Sessões do Bot',
  subtitle: 'Monitoramento em tempo real',
  empty:    'Nenhuma sessão ativa',
  columns: {
    whatsapp: 'WhatsApp',
    state:    'Estado',
    mode:     'Modo',
    lastAt:   'Última atividade',
    actions:  'Ações',
  },
  actions: {
    reset: 'Resetar sessão',
  },
  mode: {
    bot:   '🤖 bot',
    human: '🧑‍💼 humano',
  },
} as const
