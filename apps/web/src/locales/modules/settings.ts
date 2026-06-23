export const settings = {
  title:    'Configurações',
  subtitle: 'Informações da empresa e preferências do sistema.',
  company: {
    sectionTitle: 'Informações da Empresa',
    name:         'Nome da empresa',
    namePlaceholder: 'Ex: Financiamento Bot',
    logoUrl:      'URL da logo',
    logoUrlPlaceholder: 'https://...',
    logoPreview:  'Pré-visualização',
    email:        'E-mail de contato',
    emailPlaceholder: 'contato@empresa.com',
    phone:        'Telefone',
    phonePlaceholder: '(11) 99999-9999',
    saveSuccess:  'Configurações salvas com sucesso!',
  },
  emailReset: {
    sectionTitle: 'Recuperação de Senha por E-mail',
    label:        'Recuperação via e-mail',
    description:  'Permite que usuários redefina a senha via link enviado por e-mail. Requer configuração SMTP ativa no servidor.',
    smtpHint:     'Configure as variáveis de ambiente SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM e FRONTEND_URL no servidor.',
  },
} as const
