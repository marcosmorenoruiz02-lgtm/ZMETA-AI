import { isPublicHttpsUrl, fetchPublic } from '@/lib/server/urls'

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta'
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_MEDIA_BYTES = 20 * 1024 * 1024

const AUDIO_MIME = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/mpeg',
])

export function geminiModel() {
  const model = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim()
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
    const err = new Error('GEMINI_MODEL no es un identificador válido.')
    err.status = 500
    throw err
  }
  return model
}

export function isGemini3Family(model = geminiModel()) {
  return /^gemini-3/i.test(model)
}

export function buildGenerationConfig({ temperature = 0.8, json = true, model = geminiModel() } = {}) {
  const generationConfig = {}
  if (json) generationConfig.responseMimeType = 'application/json'
  if (isGemini3Family(model)) {
    generationConfig.thinkingConfig = { thinkingLevel: 'low' }
  } else if (typeof temperature === 'number') {
    generationConfig.temperature = temperature
  }
  return generationConfig
}

export function parseModelJson(raw) {
  const content = String(raw || '').replace(/```json/gi, '').replace(/```/g, '').trim()
  if (!content) throw new Error('La IA devolvió una respuesta vacía. Inténtalo de nuevo.')
  try {
    return JSON.parse(content)
  } catch {
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1))
      } catch { /* sigue abajo */ }
    }
    throw new Error('La IA devolvió una respuesta que no es JSON válido. Inténtalo de nuevo.')
  }
}

function requireKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    const err = new Error('Falta GEMINI_API_KEY. Añádela para generar textos con Gemini.')
    err.status = 500
    throw err
  }
  return key
}

function normalizeAudioMime(mime) {
  const m = String(mime || '').split(';')[0].trim().toLowerCase()
  if (m === 'audio/mp3') return 'audio/mpeg'
  if (AUDIO_MIME.has(m)) return m
  if (m.startsWith('audio/')) return 'audio/mpeg'
  if (m.startsWith('video/')) return 'video/mp4'
  return ''
}

function dataUrlPart(source, { maxBytes }) {
  const match = String(source).match(/^data:([^;,]+);base64,([a-z0-9+/=\s]+)$/i)
  if (!match) return null
  const mime = match[1].toLowerCase()
  const data = match[2].replace(/\s/g, '')
  const bytes = Math.floor((data.length * 3) / 4)
  if (bytes > maxBytes) {
    const err = new Error('El archivo supera el tamaño admitido para el análisis.')
    err.status = 413
    throw err
  }
  const mimeType = mime.startsWith('image/') ? mime : normalizeAudioMime(mime)
  if (!mimeType) return null
  return { inlineData: { mimeType, data } }
}

async function remoteImagePart(url) {
  if (!isPublicHttpsUrl(url)) return null
  try {
    const res = await fetchPublic(url, { timeoutMs: 8000 })
    if (!res.ok) return null
    const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim().toLowerCase()
    if (!mime.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length || buf.length > MAX_IMAGE_BYTES) return null
    return { inlineData: { mimeType: mime, data: buf.toString('base64') } }
  } catch {
    return null
  }
}

export async function mediaToPart(source, { optional = false, maxBytes = MAX_IMAGE_BYTES } = {}) {
  if (!source || typeof source !== 'string') return null
  try {
    if (source.startsWith('data:')) return dataUrlPart(source, { maxBytes })
    if (source.startsWith('https://')) return remoteImagePart(source)
    return null
  } catch (error) {
    if (!optional) throw error
    return null
  }
}

async function postGemini(body, timeoutMs) {
  const key = requireKey()
  const model = geminiModel()
  const url = `${ENDPOINT}/models/${encodeURIComponent(model)}:generateContent`
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    const err = new Error(error?.name === 'TimeoutError' ? 'Gemini tardó demasiado. Inténtalo de nuevo.' : 'No se pudo contactar con Gemini.')
    err.status = 502
    throw err
  }
  if ((res.status === 429 || res.status >= 500)) {
    return { retry: true, res }
  }
  return { retry: false, res }
}

export async function generateJSON({ system, prompt, parts, temperature = 0.85, timeoutMs = 55000 }) {
  const model = geminiModel()
  const userParts = parts || [{ text: String(prompt || '') }]
  if (!userParts.some((part) => typeof part?.text === 'string' && part.text.trim())) {
    const err = new Error('La petición a Gemini no incluye texto.')
    err.status = 400
    throw err
  }
  const body = {
    contents: [{ role: 'user', parts: userParts }],
    generationConfig: buildGenerationConfig({ temperature, json: true, model }),
  }
  if (system) body.systemInstruction = { parts: [{ text: system }] }

  let { retry, res } = await postGemini(body, timeoutMs)
  if (retry) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    ;({ retry, res } = await postGemini(body, timeoutMs))
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    const err = new Error(`Error de Gemini (${res.status}). ${txt.replace(/\s+/g, ' ').slice(0, 180)}`.trim())
    err.status = 502
    throw err
  }
  const data = await res.json()
  const candidate = data?.candidates?.[0]
  const text = (candidate?.content?.parts || [])
    .filter((part) => part?.text && !part.thought)
    .map((part) => part.text)
    .join('')
  if (!text) {
    const block = data?.promptFeedback?.blockReason || candidate?.finishReason
    const err = new Error(block ? `Gemini no devolvió contenido (${block}).` : 'Gemini no devolvió contenido.')
    err.status = 502
    throw err
  }
  return parseModelJson(text)
}

export const SYSTEM =
  'Eres un analista de contenido viral y copywriter senior para X. Siempre respondes con JSON válido, sin markdown, sin texto adicional.'

export async function callGemini(prompt, temperature = 0.85) {
  return generateJSON({ system: SYSTEM, prompt, temperature })
}

export async function generateWithMedia({ system = SYSTEM, prompt, mediaSources = [], temperature = 0.4, mediaMaxBytes = MAX_IMAGE_BYTES }) {
  const parts = [{ text: prompt }]
  for (const source of mediaSources) {
    const part = await mediaToPart(source, { optional: true, maxBytes: mediaMaxBytes })
    if (part) parts.push(part)
  }
  return generateJSON({ system, parts, temperature })
}

export async function transcribeBuffer(buf, mime) {
  if (!buf?.length) return ''
  if (buf.length > MAX_MEDIA_BYTES) throw new Error('El archivo supera el límite de 20MB para transcripción')
  const mimeType = normalizeAudioMime(mime)
  if (!mimeType) throw new Error('Formato de audio no soportado para la transcripción.')
  const json = await generateJSON({
    system: 'Eres un transcriptor fiel. Respondes únicamente con JSON válido.',
    parts: [
      { text: 'Transcribe el audio de forma literal, en el idioma original. No inventes palabras. Si no hay habla inteligible, devuelve texto vacío. Responde SOLO JSON: {"text":"..."}' },
      { inlineData: { mimeType, data: Buffer.from(buf).toString('base64') } },
    ],
    temperature: 0.1,
    timeoutMs: 55000,
  })
  return typeof json?.text === 'string' ? json.text.trim() : ''
}

export async function transcribeMedia(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.*)$/s)
  if (!match) return ''
  return transcribeBuffer(Buffer.from(match[2], 'base64'), match[1])
}
