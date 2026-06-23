import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CompanySettings {
  company_name: string
  company_logo_url: string
  company_email: string
  company_phone: string
  email_reset_enabled: string
}

export function useCompanySettings() {
  return useQuery<CompanySettings>({
    queryKey: ['company-settings'],
    queryFn: () => api.get('/settings/company').then((r: any) => r.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useValueLabels() {
  return useQuery<Record<string, Record<string, string>>>({
    queryKey: ['value-labels'],
    queryFn: () => api.get('/settings/value-labels').then((r: any) => r.data),
    staleTime: 30 * 60 * 1000,
  })
}
