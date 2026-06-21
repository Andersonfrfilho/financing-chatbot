import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type User = {
  id: string
  name: string
  email: string
  role: { name: string; permissions: string[] }
}

type AuthState = {
  token: string | null
  refreshTokenValue: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, refreshToken: string, user: User) => void
  clearAuth: () => void
  refreshToken: () => Promise<void>
  hasPermission: (permission: string) => boolean
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

      hasPermission: (permission) => {
        const { user } = get()
        return user?.role?.permissions?.includes(permission) ?? false
      },
    }),
    { name: 'auth-storage', partialize: (state) => ({ token: state.token, refreshTokenValue: state.refreshTokenValue, user: state.user, isAuthenticated: state.isAuthenticated }) },
  ),
)
