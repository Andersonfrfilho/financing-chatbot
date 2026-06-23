export const auth = {
  login: {
    title:           'Painel Administrativo',
    emailLabel:      'E-mail',
    emailPlaceholder:'seu@email.com',
    passwordLabel:   'Senha',
    rememberMe:      'Lembrar-me',
    forgotPassword:  'Esqueci minha senha',
    submit:          'Entrar',
    submitting:      'Entrando...',
    error:           'E-mail ou senha inválidos.',
  },
  forgot: {
    title:       'Recuperar Senha',
    description: 'Informe seu e-mail e enviaremos um link para redefinir sua senha.',
    submit:      'Enviar link',
    submitting:  'Enviando...',
    backToLogin: 'Voltar ao login',
    disabledWarning:
      'Recuperação por e-mail não está habilitada neste sistema. Entre em contato com o administrador.',
    errors: {
      disabled: 'Recuperação por e-mail não está habilitada. Entre em contato com o administrador.',
      generic:  'Não foi possível enviar o e-mail. Tente novamente.',
    },
  },
  forgotSent: {
    title:       'E-mail enviado!',
    description: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.',
    backToLogin: 'Voltar ao login',
  },
  reset: {
    title:            'Redefinir Senha',
    newPassword:      'Nova senha',
    confirmPassword:  'Confirmar senha',
    submit:           'Redefinir Senha',
    submitting:       'Salvando...',
    backToLogin:      'Voltar ao login',
    minLength:        'A senha deve ter no mínimo 8 caracteres.',
    mismatch:         'As senhas não coincidem.',
    invalidToken:     'Token inválido ou ausente.',
    errors: {
      generic: 'Token inválido ou expirado.',
    },
    success: {
      title:       'Senha redefinida!',
      description: 'Sua senha foi alterada com sucesso. Você já pode fazer login.',
      action:      'Ir para o Login',
    },
  },
  adminPanel: 'Painel Administrativo',
  restrictedAccess: (name: string) => `${name} · Acesso restrito`,
} as const
