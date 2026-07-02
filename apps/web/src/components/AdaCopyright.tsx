import { AdaTechLogoFull } from './AdaTechLogo'
import { common } from '@/locales'

export function AdaCopyright({ className = '' }: { className?: string }) {
  const year = new Date().getFullYear()

  return (
    <div className={`flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 ${className}`}>
      <AdaTechLogoFull height={16} variant="auto" className="opacity-60 dark:opacity-40 text-gray-500 dark:text-gray-400" />
      <span>{common.copyright(year)}</span>
    </div>
  )
}
