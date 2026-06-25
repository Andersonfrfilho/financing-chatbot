import { useState, useEffect } from 'react'
import { Save, Building2, Mail, Phone, Image, Calculator, MessageSquare, Plus, RefreshCw, Trash2, SendHorizonal } from 'lucide-react'
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

  const [createTemplate, setCreateTemplate] = useState({ name: '', category: 'UTILITY', language: 'pt_BR', headerType: 'NONE' as 'NONE' | 'TEXT', headerText: '', bodyText: '', footerText: '' })
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [createTemplateResult, setCreateTemplateResult] = useState<{ ok: boolean; message: string; status?: string } | null>(null)

  const { data: whatsappSettings } = useQuery<{ whatsapp_template_name: string; whatsapp_template_language: string; whatsapp_template_variables: string[] }>({
    queryKey: ['whatsapp-settings'],
    queryFn: () => api.get('/settings/whatsapp').then((r: any) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  type WhatsAppTemplate = { id: string; name: string; shortId: string; displayName: string; status: string; category: string; language: string; bodyText: string | null; variableCount: number }
  const { data: whatsappTemplates, isLoading: loadingTemplates, refetch: refetchTemplates, isError: templatesError } =
    useQuery<{ templates: WhatsAppTemplate[] }>({
      queryKey: ['whatsapp-templates'],
      queryFn: () => api.get('/settings/whatsapp/templates').then((r: any) => r.data),
      staleTime: 2 * 60 * 1000,
      retry: false,
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

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault()
    setCreatingTemplate(true)
    setCreateTemplateResult(null)
    try {
      const { data } = await api.post('/settings/whatsapp/templates', createTemplate)
      setCreateTemplateResult({ ok: true, message: data.message, status: data.status })
      setCreateTemplate({ name: '', category: 'UTILITY', language: 'pt_BR', headerType: 'NONE', headerText: '', bodyText: '', footerText: '' })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] })
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Erro ao criar template'
      setCreateTemplateResult({ ok: false, message })
    } finally {
      setCreatingTemplate(false)
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Template aprovado
              </label>
              <button
                type="button"
                onClick={() => refetchTemplates()}
                disabled={loadingTemplates}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                <RefreshCw size={11} className={loadingTemplates ? 'animate-spin' : ''} />
                Atualizar lista
              </button>
            </div>

            {templatesError && (
              <div className="mb-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                Não foi possível carregar os templates da API. Verifique WHATSAPP_BUSINESS_ACCOUNT_ID e WHATSAPP_ACCESS_TOKEN.
                <br />
                <span className="text-gray-500 dark:text-gray-400 mt-0.5 block">Nome atual salvo: <strong>{whatsappTemplateName || '—'}</strong></span>
              </div>
            )}

            {loadingTemplates && (
              <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
            )}

            {!loadingTemplates && !templatesError && (
              <select
                value={whatsappTemplateName}
                onChange={(e) => {
                  const selected = whatsappTemplates?.templates.find((template) => template.name === e.target.value)
                  setWhatsappTemplateName(e.target.value)
                  if (selected) {
                    setWhatsappTemplateLanguage(selected.language)
                    if (selected.variableCount > 0 && whatsappTemplateVariables.length === 0) {
                      setWhatsappTemplateVariables(Array.from({ length: selected.variableCount }, () => ''))
                    }
                  }
                }}
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              >
                <option value="">— Selecione um template —</option>
                {whatsappTemplates?.templates.map((template) => (
                  <option key={`${template.name}-${template.language}`} value={template.name} disabled={template.status !== 'APPROVED'}>
                    {template.displayName} · {template.shortId} ({template.language}) {template.status !== 'APPROVED' ? `[${template.status}]` : ''}
                  </option>
                ))}
              </select>
            )}

            {(() => {
              const selected = whatsappTemplates?.templates.find((template) => template.name === whatsappTemplateName)
              return selected?.bodyText ? (
                <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {selected.bodyText}
                </div>
              ) : null
            })()}
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

      {/* Criar Novo Template */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-600 dark:text-blue-400" />
            Criar Template WhatsApp
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Cria um novo template e envia para aprovação do WhatsApp. Use {'{{1}}'}, {'{{2}}'} como placeholders para variáveis.
          </p>
        </div>
        <form onSubmit={handleCreateTemplate} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome do template</label>
            <p className="text-xs text-gray-400 mb-1.5">Apenas letras minúsculas, números e underscore (ex: reengajamento_cliente)</p>
            <input
              type="text"
              value={createTemplate.name}
              onChange={(e) => setCreateTemplate({ ...createTemplate, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
              placeholder="reengajamento_cliente"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
              <select
                value={createTemplate.category}
                onChange={(e) => setCreateTemplate({ ...createTemplate, category: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              >
                <option value="UTILITY">UTILITY (Transacional)</option>
                <option value="MARKETING">MARKETING (Promocional)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Idioma</label>
              <select
                value={createTemplate.language}
                onChange={(e) => setCreateTemplate({ ...createTemplate, language: e.target.value })}
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              >
                <option value="pt_BR">Português (Brasil)</option>
                <option value="en_US">English (US)</option>
                <option value="es_ES">Español</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cabeçalho (opcional)</label>
            <p className="text-xs text-gray-400 mb-1.5">Texto destacado no topo da mensagem (até 60 caracteres)</p>
            <div className="flex gap-2">
              <select
                value={createTemplate.headerType}
                onChange={(e) => setCreateTemplate({ ...createTemplate, headerType: e.target.value as 'NONE' | 'TEXT' })}
                className="border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              >
                <option value="NONE">Sem cabeçalho</option>
                <option value="TEXT">Texto</option>
              </select>
              {createTemplate.headerType === 'TEXT' && (
                <input
                  type="text"
                  value={createTemplate.headerText}
                  onChange={(e) => setCreateTemplate({ ...createTemplate, headerText: e.target.value })}
                  placeholder="Ex: Financiamento Imobiliário"
                  maxLength={60}
                  className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Corpo da mensagem
            </label>
            <p className="text-xs text-gray-400 mb-1.5">
              Use {'{{1}}'}, {'{{2}}'}, etc. para variáveis. Máximo 1024 caracteres.
            </p>
            <textarea
              value={createTemplate.bodyText}
              onChange={(e) => setCreateTemplate({ ...createTemplate, bodyText: e.target.value })}
              placeholder="Olá {{1}}! 👋 Seu financiamento de {{2}} está disponível. Entre em contato para mais informações."
              rows={4}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
              required
            />
            {(() => {
              const vars = createTemplate.bodyText.match(/\{\{(\d+)\}\}/g) ?? []
              if (vars.length === 0) return null
              const examples = ['Nome do cliente', 'Produto', 'Valor', 'Prazo', 'Banco']
              return (
                <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-3 py-2">
                  <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Variáveis detectadas</p>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(vars.map(v => v.replace(/[\{\}]/g, '')))].sort().map((num) => (
                      <span key={num} className="inline-flex items-center gap-1 text-[10px]">
                        <code className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">{`{{${num}}}`}</code>
                        <span className="text-gray-400 dark:text-gray-500">= {examples[Number(num) - 1] ?? `Variável ${num}`}</span>
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                    Configure os valores reais em <strong>Template de Reengajamento → Variáveis</strong> após selecionar o template.
                  </p>
                </div>
              )
            })()}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rodapé (opcional)</label>
            <p className="text-xs text-gray-400 mb-1.5">Texto pequeno no final da mensagem (até 60 caracteres)</p>
            <input
              type="text"
              value={createTemplate.footerText}
              onChange={(e) => setCreateTemplate({ ...createTemplate, footerText: e.target.value })}
              placeholder="Ex: Financiamento Bot · financimento.bot"
              maxLength={60}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Preview */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Pré-visualização</label>
            <div className="rounded-2xl bg-[#e5ddd5] dark:bg-[#1a1a2e] border border-gray-300 dark:border-gray-600 overflow-hidden shadow-inner">
              {/* Barra superior do WhatsApp */}
              <div className="bg-[#075e54] dark:bg-[#075e54] px-4 py-2.5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                  {company?.company_name?.slice(0, 2).toUpperCase() || 'FB'}
                </div>
                <div>
                  <p className="text-white text-xs font-semibold leading-tight">{company?.company_name || 'Financiamento Bot'}</p>
                  <p className="text-white/60 text-[10px]">online</p>
                </div>
              </div>
              {/* Chat area */}
              <div className="px-3 py-4 space-y-3 min-h-[120px]">
                <div className="flex justify-start max-w-[85%]">
                  <div className="bg-white dark:bg-gray-700 rounded-lg rounded-tl-none px-3 py-2 shadow-sm">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                      Este modelo de mensagem será usado como template no WhatsApp. O texto com {'{{1}}'} será substituído pelo valor real no envio.
                    </p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 text-right">12:00</p>
                  </div>
                </div>
                <div className="flex justify-end max-w-[85%] ml-auto">
                  <div className="bg-[#dcf8c6] dark:bg-[#1b5e20] rounded-lg rounded-tr-none px-3 py-2 shadow-sm">
                    {createTemplate.headerType === 'TEXT' && createTemplate.headerText && (
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1">
                        {createTemplate.headerText.replace(/\{\{1\}\}/g, 'João').replace(/\{\{2\}\}/g, 'Imóvel') || 'Cabeçalho'}
                      </p>
                    )}
                    <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                      {createTemplate.bodyText
                        ? createTemplate.bodyText
                            .replace(/\{\{1\}\}/g, 'João')
                            .replace(/\{\{2\}\}/g, 'Imóvel')
                            .replace(/\{\{3\}\}/g, 'R$ 1.500')
                        : <span className="text-gray-400 italic">Digite o corpo da mensagem...</span>
                      }
                    </p>
                    {createTemplate.footerText && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1">
                        {createTemplate.footerText}
                      </p>
                    )}
                    <p className="text-[9px] text-gray-400 dark:text-gray-400 mt-1 text-right">12:01 ✓</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {createTemplateResult && (
            <div className={`rounded-xl px-4 py-3 text-sm ${
              createTemplateResult.ok
                ? 'bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
            }`}>
              {createTemplateResult.message}
              {createTemplateResult.ok && (
                <p className="text-xs mt-1 opacity-75">Status: {createTemplateResult.status}. O template ficará disponível após aprovação do WhatsApp (geralmente 1-2 minutos).</p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creatingTemplate || !createTemplate.name || !createTemplate.bodyText}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              {creatingTemplate
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <SendHorizonal size={14} />
              }
              {creatingTemplate ? 'Enviando...' : 'Enviar para Aprovação'}
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
