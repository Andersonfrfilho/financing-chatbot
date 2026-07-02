export const billing = {
  grace: {
    title:   'Assinatura em atraso',
    message: (daysOverdue: number, graceDaysRemaining: number) =>
      `Sua assinatura está vencida há ${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'}. Regularize o pagamento em até ${graceDaysRemaining} ${graceDaysRemaining === 1 ? 'dia' : 'dias'} para evitar o bloqueio do sistema.`,
  },
  locked: {
    title:   'Sistema bloqueado',
    message: 'Sua assinatura está em atraso e o sistema foi bloqueado para novas ações. Entre em contato com a Ada Technology para regularizar o pagamento.',
  },
  toast: {
    blocked: 'Ação bloqueada: assinatura em atraso. Regularize o pagamento para continuar.',
  },
} as const
