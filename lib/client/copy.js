export function formatNum(n) {
  if (n === null || n === undefined) return '0'
  const value = Number(n) || 0
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K'
  return String(value)
}

export const SUGGESTED_TOPICS = ['Inteligencia Artificial', 'SaaS', 'Finanzas personales', 'Marketing digital', 'Productividad', 'Startups', 'Cripto']

export const NICHES = [
  { value: 'tech_ai', label: 'Tech & IA' },
  { value: 'finance', label: 'Finanzas / Trading' },
  { value: 'webdev', label: 'Desarrollo Web' },
  { value: 'entertainment', label: 'Entretenimiento' },
]

export const TEXT_FORMATS = [
  { key: 'thread', label: 'Hilo', desc: 'Un inicio que invita a seguir leyendo' },
  { key: 'controversy', label: 'Debate', desc: 'Una opinión que genera respuestas' },
  { key: 'myth', label: 'Mito y realidad', desc: 'Desmonta una creencia de tu tema' },
]

export const STYLE_META = {
  'Educativo / Lista': { tone: 'sky' },
  'Provocativo / Opinión': { tone: 'rose' },
  'Directo / Gancho corto': { tone: 'amber' },
}

export const PERSONALITY_LABELS = {
  tono_general: 'Tono',
  nivel_humor: 'Humor',
  nivel_ironia: 'Ironía',
  nivel_sarcasmo: 'Sarcasmo',
  nivel_critica: 'Crítica',
  nivel_emocional: 'Emoción',
  ritmo_escritura: 'Ritmo',
  uso_emojis: 'Emojis',
  uso_hashtags: 'Hashtags',
  estructura_habitual: 'Estructura',
  objetivo_principal: 'Objetivo',
  nivel_polarizacion: 'Polarización',
}
