// @ts-nocheck
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { catalogs as text } from '@/locales'
import { Button, Input, Skeleton } from '@/components/ui'

export function CatalogsPage() {
  const [catalogId, setCatalogId] = useState('')
  const queryClient = useQueryClient()

  const { data: activeCatalog, isLoading } = useQuery<{ catalogId: string | null }>({
    queryKey: ['catalogs', 'active'],
    queryFn: () => api.get('/catalogs/active').then((r: any) => r.data),
  })

  useEffect(() => {
    setCatalogId(activeCatalog?.catalogId ?? '')
  }, [activeCatalog?.catalogId])

  const setActiveCatalog = useMutation({
    mutationFn: () => api.put('/catalogs/active', { catalogId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogs', 'active'] }),
  })

  if (isLoading) return (
    <div className="space-y-4 md:space-y-6">
      <div><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-64 mt-2" /></div>
      <Skeleton className="h-24 w-full max-w-md" />
    </div>
  )

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{text.title}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{text.description}</p>
      </div>

      <div className="border rounded-xl p-4 md:p-6 max-w-md space-y-4">
        <div>
          <label className="text-sm font-medium">{text.activeLabel}</label>
          <Input
            value={catalogId}
            onChange={(e) => setCatalogId(e.target.value)}
            placeholder={text.placeholder}
          />
        </div>
        <Button
          onClick={() => setActiveCatalog.mutate()}
          disabled={setActiveCatalog.isPending || !catalogId}
        >
          {setActiveCatalog.isPending ? text.saving : text.save}
        </Button>
      </div>
    </div>
  )
}
