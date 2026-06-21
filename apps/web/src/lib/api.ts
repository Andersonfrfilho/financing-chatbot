import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const { refreshToken, clearAuth } = useAuthStore.getState()
      try {
        await refreshToken()
        const token = useAuthStore.getState().token
        error.config.headers.Authorization = `Bearer ${token}`
        return api.request(error.config)
      } catch {
        clearAuth()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
