interface AvatarProps {
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
}

const bgColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-indigo-500',
]

function getInitials(name: string | undefined | null): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (parts[0]?.substring(0, 2) || '?').toUpperCase()
}

function getBgColor(name: string | undefined | null): string {
  if (!name) return 'bg-gray-400'
  const hash = name.charCodeAt(0) + (name.charCodeAt(name.length - 1) || 0)
  return bgColors[hash % bgColors.length]
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const initials = getInitials(name)
  const bgColor = getBgColor(name)
  const sizeClass = sizeMap[size]

  return (
    <div
      className={`${sizeClass} ${bgColor} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
      title={name || undefined}
    >
      {initials}
    </div>
  )
}
