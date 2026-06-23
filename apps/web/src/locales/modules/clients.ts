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
  },
  edit: {
    title: 'Editar Cliente',
  },
  detail: {
    title: 'Detalhes do Cliente',
  },
} as const
