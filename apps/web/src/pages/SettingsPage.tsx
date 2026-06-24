import { useState, useEffect } from 'react'
import { Save, Building2, Mail, Phone, Image, Calculator, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCompanySettings } from '@/hooks/useCompanySettings'
import { Skeleton } from '@/components/ui/skeleton'

export function SettingsPage() {
  const { data: company, isLoading } = useCompanySettings()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [emailResetEnabled, setEmailResetEnabled] = useState(false)
  const [simulationsEnabled, setSimulationsEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingToggle, setSavingToggle] = useState(false)
  const [success, setSuccess] = useState(false)

  const [whatsappTemplateName, setWhatsappTemplateName] = useState('')
  const [whatsappTemplateLanguage, setWhatsappTemplateLanguage] = useState('pt_BR')
  const [whatsappTemplateVariables, setWhatsappTemplateVariables] = useState<string[]>([])
  const [savingWhatsapp, setSavingWhatsapp] = useState(false)
  const [whatsappSuccess, setWhatsappSuccess] = useState(false)

  const { data: whatsappSettings } = useQuery<{ whatsapp_template_name: string; whatsapp_template_language: string; whatsapp_template_variables: string[] }>({
    queryKey: ['whatsapp-settings'],
    queryFn: () => api.get('/settings/whatsapp').then((r: any) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (company) {
      setName(company.company_name || '')
      setLogoUrl(company.company_logo_url || '')
      setEmail(company.company_email || '')
      setPhone(company.company_phone || '')
      setEmailResetEnabled(company.email_reset_enabled === 'true')
      setSimulationsEnabled(company.simulations_enabled !== 'false')
    }
  }, [company])

  useEffect(() => {
    if (whatsappSettings) {
      setWhatsappTemplateName(whatsappSettings.whatsapp_template_name || '')
      setWhatsappTemplateLanguage(whatsappSettings.whatsapp_template_language || 'pt_BR')
      setWhatsappTemplateVariables(whatsappSettings.whatsapp_template_variables ?? [])
    }
  }, [whatsappSettings])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    try {
      await api.put('/settings/company', {
        company_name: name,
        company_logo_url: logoUrl,
        company_email: email,
        company_phone: phone,
      })
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function toggleEmailReset(val: boolean) {
    setSavingToggle(true)
    try {
      await api.put('/settings/email-reset-enabled', { enabled: val })
      setEmailResetEnabled(val)
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
    } finally {
      setSavingToggle(false)
    }
  }

  async function handleSaveWhatsapp(e: React.FormEvent) {
    e.preventDefault()
    setSavingWhatsapp(true)
    setWhatsappSuccess(false)
    try {
      await api.put('/settings/whatsapp', {
        whatsapp_template_name:      whatsappTemplateName,
        whatsapp_template_language:  whatsappTemplateLanguage,
        whatsapp_template_variables: whatsappTemplateVariables,
      })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] })
      setWhatsappSuccess(true)
      setTimeout(() => setWhatsappSuccess(false), 3000)
    } finally {
      setSavingWhatsapp(false)
    }
  }

  async function toggleSimulations(val: boolean) {
    setSavingToggle(true)
    try {
      await api.put('/settings/simulations-enabled', { enabled: val })
      setSimulationsEnabled(val)
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
    } finally {
      setSavingToggle(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Informações da empresa e preferências do sistema.</p>
      </div>

      {/* Informações da empresa */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
            Informações da Empresa
          </h2>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nome da empresa
            </label>
            <div className="relative">
              <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Financiamento Bot"
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              URL da logo
            </label>
            <div className="relative">
              <Image size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            {logoUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img src={logoUrl} alt="preview" className="h-8 w-8 rounded object-contain border border-gray-200 dark:border-gray-700" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span className="text-xs text-gray-500 dark:text-gray-400">Pré-visualização</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              E-mail de contato
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@empresa.com"
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Telefone
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {success && (
            <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-400">
              Configurações salvas com sucesso!
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </section>

      {/* E-mail de recuperação de senha */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Mail size={16} className="text-blue-600 dark:text-blue-400" />
            Recuperação de Senha por E-mail
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Recuperação via e-mail
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Permite que usuários redefina a senha via link enviado por e-mail. Requer configuração SMTP ativa no servidor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleEmailReset(!emailResetEnabled)}
              disabled={savingToggle}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                ${emailResetEnabled
                  ? 'bg-blue-600 dark:bg-blue-500'
                  : 'bg-gray-200 dark:bg-gray-700'
                }
                ${savingToggle ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              role="switch"
              aria-checked={emailResetEnabled}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                  ${emailResetEnabled ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
          {emailResetEnabled && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-400">
              Configure as variáveis de ambiente SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM e FRONTEND_URL no servidor.
            </div>
          )}
        </div>
      </section>

      {/* WhatsApp */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MessageSquare size={16} className="text-green-600 dark:text-green-400" />
            WhatsApp — Template de Reengajamento
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Template HSM usado para reabrir conversas com janela de 24h expirada. O nome deve corresponder a um template aprovado no WhatsApp Business Manager.
          </p>
        </div>
        <form onSubmit={handleSaveWhatsapp} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nome do template
            </label>
            <input
              type="text"
              value={whatsappTemplateName}
              onChange={(e) => setWhatsappTemplateName(e.target.value)}
              placeholder="Ex: reengajamento_cliente"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Use apenas letras minúsculas, números e underscores (ex: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">ola_tudo_bem</code>).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Idioma do template
            </label>
            <select
              value={whatsappTemplateLanguage}
              onChange={(e) => setWhatsappTemplateLanguage(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            >
              <option value="pt_BR">Português (pt_BR)</option>
              <option value="en_US">English (en_US)</option>
              <option value="es">Español (es)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Variáveis do template
              </label>
              <button
                type="button"
                onClick={() => setWhatsappTemplateVariables((previous) => [...previous, ''])}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Plus size={12} />
                Adicionar variável
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
              Cada linha é um parâmetro (<code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{1}}'}</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{2}}'}</code>...) enviado ao template. Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{clientName}'}</code> para o nome do cliente e <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{phone}'}</code> para o número.
            </p>
            {whatsappTemplateVariables.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">Nenhuma variável configurada. O template será enviado sem parâmetros.</p>
            )}
            <div className="space-y-2">
              {whatsappTemplateVariables.map((variable, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 w-6 text-right flex-shrink-0">
                    {`{{${index + 1}}}`}
                  </span>
                  <input
                    type="text"
                    value={variable}
                    onChange={(e) => {
                      const updated = [...whatsappTemplateVariables]
                      updated[index] = e.target.value
                      setWhatsappTemplateVariables(updated)
                    }}
                    placeholder="Ex: {clientName}"
                    className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setWhatsappTemplateVariables((previous) => previous.filter((_, i) => i !== index))}
                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                    title="Remover variável"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {whatsappSuccess && (
            <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-400">
              Configurações de WhatsApp salvas!
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingWhatsapp || !whatsappTemplateName.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              {savingWhatsapp
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Save size={14} />
              }
              {savingWhatsapp ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </section>

      {/* Feature toggles */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Calculator size={16} className="text-blue-600 dark:text-blue-400" />
            Funcionalidades
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Simulações de financiamento
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Habilita a página de simulações no menu lateral. Desative se a funcionalidade ainda não estiver pronta.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleSimulations(!simulationsEnabled)}
              disabled={savingToggle}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                ${simulationsEnabled
                  ? 'bg-blue-600 dark:bg-blue-500'
                  : 'bg-gray-200 dark:bg-gray-700'
                }
                ${savingToggle ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              role="switch"
              aria-checked={simulationsEnabled}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                  ${simulationsEnabled ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
