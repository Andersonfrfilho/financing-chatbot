export const clients = {
  title:    'Clientes',
  subtitle: (total: number) => `${total} clientes cadastrados`,
  empty:    'Nenhum cliente encontrado',
  search:   'Buscar nome/WhatsApp...',
  columns: {
    name:      'Nome',
    whatsapp:  'WhatsApp',
    email:     'E-mail',
    cityState: 'Cidade/UF',
    createdAt: 'Cadastro',
    actions:   'Ações',
  },
  actions: {
    showHide: (show: boolean) => show ? 'Esconder dados' : 'Mostrar dados',
    create:   'Novo Cliente',
  },
  create: {
    title:             'Novo Cliente',
    name:              'Nome',
    namePlaceholder:   'Nome completo',
    whatsapp:          'WhatsApp',
    whatsappPlaceholder: '🇧🇷 +55 (16) 9 9123-1234',
    email:             'E-mail',
    emailPlaceholder:  'cliente@email.com',
    city:              'Cidade',
    state:             'UF',
    submit:            'Criar',
    success:           'Cliente criado com sucesso',
  },
  edit: {
    title: 'Editar Cliente',
  },
  detail: {
    title: 'Detalhes do Cliente',
  },
} as const
