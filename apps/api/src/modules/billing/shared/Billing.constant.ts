export const BILLING_CONFIG_KEY = {
  PAID_UNTIL:  'subscription_paid_until',
  GRACE_DAYS:  'subscription_grace_days',
} as const

export const DEFAULT_GRACE_DAYS = 5

export const MS_PER_DAY = 24 * 60 * 60 * 1000
