// Formata telefone no padrão: 🇧🇷 +55 (16) 9 9123-1234
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '').slice(-11)

  if (cleaned.length < 11) return cleaned

  // 🇧🇷 +55 (16) 9 9123-1234
  const country = '🇧🇷 +55'
  const areaCode = cleaned.slice(0, 2)
  const firstDigit = cleaned.slice(2, 3)
  const middlePart = cleaned.slice(3, 7)
  const lastPart = cleaned.slice(7, 11)

  return `${country} (${areaCode}) ${firstDigit} ${middlePart}-${lastPart}`
}

// Obfusca os últimos 4 dígitos do telefone formatado
export const obfuscatePhone = (phone: string): string => {
  const formatted = formatPhone(phone)
  return formatted.replace(/\d{4}$/, '****')
}
