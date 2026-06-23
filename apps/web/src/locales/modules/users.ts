export const users = {
  title:    'Usuários',
  subtitle: (total: number) => `${total} usuários cadastrados`,
  empty:    'Nenhum usuário encontrado',
  columns: {
    name:      'Nome',
    email:     'E-mail',
    role:      'Perfil',
    status:    'Status',
    createdAt: 'Cadastro',
    actions:   'Ações',
  },
  create: {
    title:            'Novo Usuário',
    namePlaceholder:  'Nome completo',
    emailPlaceholder: 'email@empresa.com',
    passwordLabel:    'Senha temporária',
    roleLabel:        'Perfil',
    submit:           'Criar Usuário',
  },
  edit: {
    title: 'Editar Usuário',
  },
  roles: {
    admin:    'Admin',
    operator: 'Operador',
    viewer:   'Visualizador',
  },
} as const
