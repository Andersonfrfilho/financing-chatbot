interface AdaTechLogoProps {
  size?: number
  variant?: 'light' | 'dark' | 'auto'
  className?: string
}

export function AdaTechLogo({ size = 48, variant = 'auto', className = '' }: AdaTechLogoProps) {
  const isDark = variant === 'dark'
  const isLight = variant === 'light'

  const darkBg = '#1a2332'
  const neonGreen = '#4ade80'
  const lightGreen = '#16a34a'
  const glow = 'drop-shadow(0 0 4px #4ade80) drop-shadow(0 0 8px rgba(74,222,128,0.6))'

  const strokeColor = isDark ? neonGreen : isLight ? lightGreen : 'currentColor'
  const fillColor = isDark ? neonGreen : isLight ? lightGreen : 'currentColor'
  const filter = isDark ? glow : undefined

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 300"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AdA Technology"
    >
      {/* Background (only for explicit dark variant) */}
      {isDark && <rect width="300" height="300" fill={darkBg} rx="16" />}

      <g
        stroke={strokeColor}
        fill={fillColor}
        strokeWidth="1.5"
        filter={isDark ? filter : undefined}
      >
        {/* ── Outer triangle edges ── */}
        {/* Apex → base-left */}
        <line x1="150" y1="20" x2="30"  y2="200" />
        {/* Apex → base-right */}
        <line x1="150" y1="20" x2="270" y2="200" />
        {/* Base */}
        <line x1="30"  y1="200" x2="270" y2="200" />

        {/* ── Side midpoint connections ── */}
        {/* Left-upper (L1) to right side */}
        <line x1="90"  y1="80"  x2="270" y2="200" />
        {/* Right-upper (R1) to left side */}
        <line x1="210" y1="80"  x2="30"  y2="200" />
        {/* Left-lower (L2) to right-upper (R1) */}
        <line x1="60"  y1="140" x2="210" y2="80"  />
        {/* Right-lower (R2) to left-upper (L1) */}
        <line x1="240" y1="140" x2="90"  y2="80"  />
        {/* Left-lower ↔ Right-lower */}
        <line x1="60"  y1="140" x2="240" y2="140" />
        {/* Apex to left-lower */}
        <line x1="150" y1="20"  x2="60"  y2="140" />
        {/* Apex to right-lower */}
        <line x1="150" y1="20"  x2="240" y2="140" />

        {/* ── Inner ring connections (hexagonal) ── */}
        {/* Inner ring: 6 nodes at radius ~50 around center (150,130) */}
        {/* I0=(150,80) I1=(193,105) I2=(193,155) I3=(150,180) I4=(107,155) I5=(107,105) */}
        <line x1="150" y1="80"  x2="193" y2="105" />
        <line x1="193" y1="105" x2="193" y2="155" />
        <line x1="193" y1="155" x2="150" y2="180" />
        <line x1="150" y1="180" x2="107" y2="155" />
        <line x1="107" y1="155" x2="107" y2="105" />
        <line x1="107" y1="105" x2="150" y2="80"  />

        {/* Inner ring star diagonals */}
        <line x1="150" y1="80"  x2="193" y2="155" />
        <line x1="150" y1="80"  x2="107" y2="155" />
        <line x1="193" y1="105" x2="107" y2="155" />
        <line x1="193" y1="105" x2="150" y2="180" />
        <line x1="193" y1="155" x2="107" y2="105" />
        <line x1="107" y1="105" x2="150" y2="180" />

        {/* ── Inner ring to outer nodes ── */}
        <line x1="150" y1="80"  x2="90"  y2="80"  />
        <line x1="150" y1="80"  x2="210" y2="80"  />
        <line x1="107" y1="105" x2="60"  y2="140" />
        <line x1="193" y1="105" x2="240" y2="140" />
        <line x1="107" y1="155" x2="30"  y2="200" />
        <line x1="193" y1="155" x2="270" y2="200" />
        <line x1="150" y1="180" x2="90"  y2="200" />
        <line x1="150" y1="180" x2="210" y2="200" />

        {/* ── Base segment connections ── */}
        {/* Divide base into segments: 30, 90, 150, 210, 270 */}
        <line x1="150" y1="20"  x2="90"  y2="200" />
        <line x1="150" y1="20"  x2="150" y2="200" />
        <line x1="150" y1="20"  x2="210" y2="200" />
        <line x1="90"  y1="80"  x2="30"  y2="200" />
        <line x1="210" y1="80"  x2="270" y2="200" />
        <line x1="60"  y1="140" x2="90"  y2="200" />
        <line x1="240" y1="140" x2="210" y2="200" />

        {/* ── Inner hexagon ── */}
        {/* radius ~22 around center (150,130) */}
        {/* H0=(150,108) H1=(169,119) H2=(169,141) H3=(150,152) H4=(131,141) H5=(131,119) */}
        <line x1="150" y1="108" x2="169" y2="119" />
        <line x1="169" y1="119" x2="169" y2="141" />
        <line x1="169" y1="141" x2="150" y2="152" />
        <line x1="150" y1="152" x2="131" y2="141" />
        <line x1="131" y1="141" x2="131" y2="119" />
        <line x1="131" y1="119" x2="150" y2="108" />

        {/* ── Nodes (filled circles) ── */}
        {/* Apex */}
        <circle cx="150" cy="20"  r="5" />
        {/* Side L1, R1 */}
        <circle cx="90"  cy="80"  r="4" />
        <circle cx="210" cy="80"  r="4" />
        {/* Side L2, R2 */}
        <circle cx="60"  cy="140" r="4" />
        <circle cx="240" cy="140" r="4" />
        {/* Base nodes */}
        <circle cx="30"  cy="200" r="5" />
        <circle cx="90"  cy="200" r="4" />
        <circle cx="150" cy="200" r="4" />
        <circle cx="210" cy="200" r="4" />
        <circle cx="270" cy="200" r="5" />
        {/* Inner ring */}
        <circle cx="150" cy="80"  r="4" />
        <circle cx="193" cy="105" r="4" />
        <circle cx="193" cy="155" r="4" />
        <circle cx="150" cy="180" r="4" />
        <circle cx="107" cy="155" r="4" />
        <circle cx="107" cy="105" r="4" />
        {/* Hexagon nodes */}
        <circle cx="150" cy="108" r="3" />
        <circle cx="169" cy="119" r="3" />
        <circle cx="169" cy="141" r="3" />
        <circle cx="150" cy="152" r="3" />
        <circle cx="131" cy="141" r="3" />
        <circle cx="131" cy="119" r="3" />
      </g>
    </svg>
  )
}

export function AdaTechLogoFull({
  height = 48,
  variant = 'auto',
  className = '',
}: {
  height?: number
  variant?: 'light' | 'dark' | 'auto'
  className?: string
}) {
  const isDark = variant === 'dark'
  const isLight = variant === 'light'
  const strokeColor = isDark ? '#4ade80' : isLight ? '#16a34a' : 'currentColor'
  const filter = isDark
    ? 'drop-shadow(0 0 4px #4ade80) drop-shadow(0 0 10px rgba(74,222,128,0.5))'
    : undefined

  const scale = height / 80

  return (
    <svg
      width={Math.round(80 * scale)}
      height={height}
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AdA Technology"
    >
      <g
        stroke={strokeColor}
        fill={strokeColor}
        strokeWidth="0.8"
        filter={isDark ? filter : undefined}
      >
        {/* Mini pyramid network */}
        <line x1="40" y1="4"  x2="8"  y2="50" />
        <line x1="40" y1="4"  x2="72" y2="50" />
        <line x1="8"  y1="50" x2="72" y2="50" />
        {/* Cross lines */}
        <line x1="24" y1="22" x2="72" y2="50" />
        <line x1="56" y1="22" x2="8"  y2="50" />
        <line x1="24" y1="22" x2="56" y2="22" />
        <line x1="40" y1="4"  x2="40" y2="50" />
        {/* Inner hexagon */}
        <line x1="40" y1="20" x2="51" y2="26" />
        <line x1="51" y1="26" x2="51" y2="38" />
        <line x1="51" y1="38" x2="40" y2="44" />
        <line x1="40" y1="44" x2="29" y2="38" />
        <line x1="29" y1="38" x2="29" y2="26" />
        <line x1="29" y1="26" x2="40" y2="20" />
        {/* Nodes */}
        <circle cx="40"  cy="4"  r="2.2" />
        <circle cx="24"  cy="22" r="1.8" />
        <circle cx="56"  cy="22" r="1.8" />
        <circle cx="8"   cy="50" r="2.2" />
        <circle cx="40"  cy="50" r="1.8" />
        <circle cx="72"  cy="50" r="2.2" />
        <circle cx="40"  cy="20" r="1.4" />
        <circle cx="51"  cy="26" r="1.4" />
        <circle cx="51"  cy="38" r="1.4" />
        <circle cx="40"  cy="44" r="1.4" />
        <circle cx="29"  cy="38" r="1.4" />
        <circle cx="29"  cy="26" r="1.4" />
      </g>
    </svg>
  )
}
