import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Permission = { resource: string; action: string }

type User = {
  id: string
  name: string
  email: string
  role: string
  permissions: Permission[]
}

type AuthState = {
  token: string | null
  refreshTokenValue: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, refreshToken: string, user: User) => void
  clearAuth: () => void
  refreshToken: () => Promise<void>
  hasPermission: (resource: string, action: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshTokenValue: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, refreshToken, user) =>
        set({ token, refreshTokenValue: refreshToken, user, isAuthenticated: true }),

      clearAuth: () =>
        set({ token: null, refreshTokenValue: null, user: null, isAuthenticated: false }),

      refreshToken: async () => {
        const { refreshTokenValue } = get()
        if (!refreshTokenValue) throw new Error('No refresh token')
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshTokenValue }),
        })
        if (!res.ok) throw new Error('Refresh failed')
        const data = await res.json()
        set({ token: data.accessToken })
      },

      hasPermission: (resource, action) => {
        const { user } = get()
        if (!user?.permissions) return false
        return user.permissions.some(
          (p) =>
            (p.resource === '*' && p.action === '*') ||
            (p.resource === resource && p.action === action) ||
            (p.resource === resource && p.action === '*'),
        )
      },
    }),
    { name: 'auth-storage', partialize: (state) => ({ token: state.token, refreshTokenValue: state.refreshTokenValue, user: state.user, isAuthenticated: state.isAuthenticated }) },
  ),
)
