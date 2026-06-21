import type { ZodSchema } from 'zod'
import { ValidationError } from '@/shared/errors/AppError'

export function validateBody<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    const message = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
    throw new ValidationError(message)
  }

  return result.data
}
