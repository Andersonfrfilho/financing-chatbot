import type { UserEntity, UserRole } from '../entities/User'

export interface UserRepository {
  findByEmail(email: string): Promise<(UserEntity & { role: UserRole }) | null>
  findById(id: string): Promise<(UserEntity & { role: UserRole }) | null>
}
