import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from '@/hooks/useDarkMode'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggle } = useDarkMode()

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className={`
        p-2 rounded-lg transition-colors
        text-gray-500 hover:text-gray-700 hover:bg-gray-100
        dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700
        ${className}
      `}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
