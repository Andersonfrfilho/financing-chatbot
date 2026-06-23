import { useState, useEffect } from 'react'
import { Eye, EyeOff, Lock, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { useCompanySettings } from '@/hooks/useCompanySettings'
import { AdaTechLogoFull } from '@/components/AdaTechLogo'
import { ThemeToggle } from '@/components/ThemeToggle'

type View = 'login' | 'forgot' | 'forgot-sent'

export function LoginPage() {
  const [view, setView] = useState<View>('login')

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  const { data: company } = useCompanySettings()
  const companyName = company?.company_name || import.meta.env.VITE_COMPANY_NAME || 'Sistema'
  const companyLogo = company?.company_logo_url || import.meta.env.VITE_COMPANY_LOGO_URL || ''
  const emailResetEnabled = company?.email_reset_enabled === 'true'

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberMe_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      setAuth(res.data.accessToken, res.data.refreshToken, res.data.user)
      if (rememberMe) {
        localStorage.setItem('rememberMe_email', email)
      } else {
        localStorage.removeItem('rememberMe_email')
      }
      window.location.href = '/'
    } catch {
      setLoginError('E-mail ou senha inválidos.')
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotError('')
    setForgotLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail })
      setView('forgot-sent')
    } catch (err: any) {
      const msg = err?.response?.data?.message
      if (msg?.includes('não está habilitada')) {
        setForgotError('Recuperação por e-mail não está habilitada. Entre em contato com o administrador.')
      } else {
        setForgotError('Não foi possível enviar o e-mail. Tente novamente.')
      }
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4 relative">

      {/* Theme toggle floating */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-8">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" className="h-16 w-auto mx-auto mb-4 object-contain" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
              <span className="text-white text-2xl font-bold">{companyName.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{companyName}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {view === 'login' ? 'Painel Administrativo' : 'Recuperar Senha'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-100/50 dark:shadow-black/30 border border-gray-100 dark:border-gray-700 p-8">

          {/* ── LOGIN ── */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-400"
                  />
                  Lembrar-me
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email)
                    setForgotError('')
                    setView('forgot')
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>

              {loginError && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm shadow-sm shadow-blue-200 dark:shadow-blue-900/30"
              >
                {loginLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : 'Entrar'}
              </button>
            </form>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {view === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-5">
              <button
                type="button"
                onClick={() => setView('login')}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-2"
              >
                <ArrowLeft size={14} />
                Voltar ao login
              </button>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>

              {!emailResetEnabled && (
                <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
                  Recuperação por e-mail não está habilitada neste sistema. Entre em contato com o administrador.
                </div>
              )}

              {forgotError && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
                  {forgotError}
                </div>
              )}

              <button
                type="submit"
                disabled={forgotLoading || !emailResetEnabled}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {forgotLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : 'Enviar link'}
              </button>
            </form>
          )}

          {/* ── FORGOT SENT ── */}
          {view === 'forgot-sent' && (
            <div className="text-center py-4 space-y-4">
              <CheckCircle size={48} className="mx-auto text-green-500" />
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">E-mail enviado!</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Se este e-mail estiver cadastrado, você receberá as instruções em breve.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView('login')}
                className="flex items-center gap-1.5 mx-auto text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
              >
                <ArrowLeft size={14} />
                Voltar ao login
              </button>
            </div>
          )}
        </div>

        {/* Copyright AdA */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <AdaTechLogoFull height={14} variant="auto" className="text-gray-400 dark:text-gray-600 opacity-60" />
          <p className="text-xs text-gray-400 dark:text-gray-600">
            © {new Date().getFullYear()} AdA Technology
          </p>
        </div>
      </div>
    </div>
  )
}
