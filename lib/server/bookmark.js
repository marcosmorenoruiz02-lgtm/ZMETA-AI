import { clamp } from '@/lib/server/number'

const URL_RE = /https?:\/\/[^\s]+/gi
const CLUSTER_CONFIG = {
  tech_ai: { label: 'Tech & IA', keywords: ['ia', 'ai', 'modelo', 'prompt', 'gpt', 'llm', 'agente', 'automatiza', 'framework', 'api', 'dataset', 'machine learning', 'algoritmo'], ctaHint: '¿Qué herramienta de IA usarías tú? 👇' },
  finance: { label: 'Finanzas / Trading', keywords: ['roi', 'interés', 'cartera', 'invertir', 'inversión', 'trading', 'activo', 'dividendo', 'mercado', 'cripto', 'bolsa', 'rentabilidad'], ctaHint: '¿En qué activo estás dentro ahora mismo? 👇' },
  webdev: { label: 'Desarrollo Web', keywords: ['react', 'next', 'css', 'api', 'deploy', 'javascript', 'typescript', 'frontend', 'backend', 'tailwind', 'node', 'componente', 'hook'], ctaHint: '¿Con qué stack lo montarías? Comenta 👇' },
  entertainment: { label: 'Entretenimiento', keywords: ['historia', 'increíble', 'nadie', 'secreto', 'viral', 'no vas a creer', 'reacción', 'momento', 'épico'], ctaHint: '¿Te ha pasado? Cuéntamelo 👇' },
}
const CTA_PHRASES = ['comenta', 'responde', 'qué opinas', 'que opinas', 'cuéntame', 'cuentame', 'etiqueta', 'guarda', 'guárdalo', 'guardalo', 'rt', 'retwittea', 'comparte', 'dime', '👇', 'tu turno', 'de acuerdo?']
const NICHE_STOP = new Set(['para', 'con', 'los', 'las', 'del', 'de', 'la', 'el', 'y', 'e', 'o', 'u', 'a', 'en', 'un', 'una', 'the', 'and', 'for'])

export function resolveClusterConfig(cluster) {
  const raw = String(cluster || '').trim()
  if (!raw) return CLUSTER_CONFIG.tech_ai
  if (CLUSTER_CONFIG[raw]) return CLUSTER_CONFIG[raw]
  const byLabel = Object.values(CLUSTER_CONFIG).find((c) => c.label.toLowerCase() === raw.toLowerCase())
  if (byLabel) return byLabel
  const keywords = raw.toLowerCase().split(/[^a-záéíóúñ0-9]+/i).filter((w) => w.length >= 4 && !NICHE_STOP.has(w))
  return { label: raw, keywords: keywords.length ? keywords : [raw.toLowerCase()], ctaHint: `¿Qué opinas sobre ${raw}? Comenta tu experiencia 👇`, custom: true }
}

export function computeBookmarkScore(text = '', cluster = 'tech_ai', hasThread = false, firstReply = '') {
  const raw = String(text || '')
  const t = raw.toLowerCase()
  const cfg = resolveClusterConfig(cluster)
  const lines = raw.split('\n').filter((l) => l.trim().length)
  const links = raw.match(URL_RE) || []
  const hasExternalLink = links.length > 0

  const numberedList = /(^|\n)\s*(\d+[\.\)]|[-•*→✅▪])/m.test(raw)
  const listCount = (raw.match(/(^|\n)\s*(\d+[\.\)]|[-•*→✅▪])/gm) || []).length
  const hasNumbers = /\d/.test(raw)
  const hasStat = /(\d+\s?%|\$\s?\d|\d+x\b|\d{3,})/.test(raw)
  const hasHook = /(cómo|como|por qué|porque|deja de|nadie|secreto|guía|aprende|esto|estos \d|\d+ formas|\d+ pasos|truco)/.test(t)
  const kwHits = cfg.keywords.filter((k) => t.includes(k)).length
  const saveVerbs = /(guarda|guárdalo|referencia|plantilla|checklist|hilo|no pierdas|para después|bookmark)/.test(t)
  const len = raw.trim().length
  const hasQuestion = raw.includes('?') || raw.includes('¿')
  const hasCtaPhrase = CTA_PHRASES.some((p) => {
    if (/^[a-záéíóúñ]+$/i.test(p)) return new RegExp(`(^|[^a-záéíóúñ])${p}([^a-záéíóúñ]|$)`, 'i').test(t)
    return t.includes(p)
  })

  let structure = 20
  if (lines.length >= 3) structure += 25
  if (numberedList) structure += Math.min(35, listCount * 9)
  if (hasThread) structure += 20
  if (len >= 120 && len <= 700) structure += 10
  structure = clamp(structure)

  let actionability = 15
  if (hasHook) actionability += 30
  if (numberedList) actionability += 25
  if (/(cómo|guía|pasos|aprende|usa|haz|evita|deja de)/.test(t)) actionability += 20
  if (kwHits > 0) actionability += Math.min(15, kwHits * 5)
  actionability = clamp(actionability)

  let specificity = 20
  if (hasNumbers) specificity += 15
  if (hasStat) specificity += 30
  if (kwHits >= 2) specificity += 25
  else if (kwHits === 1) specificity += 12
  specificity = clamp(specificity)

  let saveability = 15
  if (saveVerbs) saveability += 25
  if (numberedList && listCount >= 3) saveability += 25
  if (hasStat) saveability += 15
  if (hasThread) saveability += 15
  if (hasHook) saveability += 10
  saveability = clamp(saveability)

  let score = actionability * 0.3 + structure * 0.25 + specificity * 0.2 + saveability * 0.25
  if (hasExternalLink && !hasThread) score -= 12
  if (len > 280 && !hasThread) score -= 10
  if (len < 40) score = Math.min(score, 35)
  score = clamp(score)

  const grade = score >= 85 ? 'elite' : score >= 65 ? 'high' : score >= 40 ? 'medium' : 'low'

  const missing = []
  if (!numberedList) missing.push('Añade una lista numerada o con viñetas (formato guardable)')
  if (!hasStat) missing.push('Incluye un dato o estadística concreta (%, cifra, Nx)')
  if (!hasHook) missing.push('Refuerza el gancho de la primera línea (curiosidad o promesa clara)')
  if (kwHits === 0) missing.push(`Usa términos propios del nicho ${cfg.label} para activar el SimCluster`)
  if (len > 280 && !hasThread) missing.push('Divide en HILO: el texto supera 280 caracteres')
  if (hasExternalLink && !hasThread) missing.push('Mueve el link externo a la primera respuesta (protege el alcance)')

  let suggested_format = 'Post directo con gancho + valor accionable'
  if (score >= 65 && numberedList) suggested_format = `Hilo de "${Math.max(3, listCount)} claves accionables" (${cfg.label})`
  else if (!numberedList) suggested_format = `Convierte en lista de "N pasos/errores" del nicho ${cfg.label}`

  const ctaPresent = hasQuestion || hasCtaPhrase
  const cta = {
    present: ctaPresent,
    type: hasQuestion ? 'question' : hasCtaPhrase ? 'incentive' : 'none',
    suggestion: ctaPresent ? 'CTA detectado: mantén la pregunta abierta al final para maximizar respuestas en los primeros 30 min.' : cfg.ctaHint,
  }

  return {
    score,
    grade,
    breakdown: { actionability, structure, specificity, saveability },
    missing_elements: missing,
    suggested_format,
    cta,
    linkIsolation: { hasExternalLink, links, recommendMoveToReply: hasExternalLink && !firstReply },
    cluster,
  }
}
