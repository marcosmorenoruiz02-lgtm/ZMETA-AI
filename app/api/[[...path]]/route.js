import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { buildAlerts } from '@/lib/constants/alerts'

// ----------------------------- MongoDB -----------------------------
let client
let db

async function connectToMongo() {
  if (db) return db
  const c = new MongoClient(process.env.MONGO_URL)
  await c.connect()
  client = c
  db = c.db(process.env.DB_NAME)
  return db
}

// ----------------------------- CORS -----------------------------
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// ----------------------------- Config -----------------------------
const TWITTER_KEY = process.env.TWITTER_API_IO_KEY
const TWITTER_BASE = 'https://api.twitterapi.io'
const LLM_KEY = process.env.EMERGENT_LLM_KEY
const LLM_BASE = process.env.EMERGENT_LLM_BASE_URL || 'https://integrations.emergentagent.com/llm'
const LLM_MODEL = 'gemini/gemini-2.5-flash'
const SYSTEM =
  'Eres un analista de contenido viral y copywriter senior para X. Siempre respondes con JSON válido, sin markdown, sin texto adicional.'

const SCORE_SPEC = `Para CADA tweet generado calcula un SCORE DE VIRALIDAD PREDICTIVO realista:
  - hookStrength: entero 0-100 (fuerza del gancho en la primera línea)
  - retention: "Alta" | "Media" | "Baja"
  - weakPoint: una frase corta señalando el punto débil o mayor área de mejora`

const COPY_RULES = `REGLAS DE COPY PARA X (obligatorias):
  - Cada tweet DEBE caber en 280 caracteres como máximo.
  - Si la idea necesita más espacio, divídela en un HILO: rellena el campo "thread" (array de strings, cada uno ≤280 chars) donde thread[0] es el gancho y el resto continúa; deja "text" igual a thread[0]. Si el tweet cabe en 280, "thread" debe ser [] (array vacío).
  - NO incluyas placeholders como [IMAGEN], [VIDEO], [LINK], [ADJUNTO].
  - Aplica disparadores de viralidad: pattern interrupt, brecha de curiosidad, polarización, controversia o sarcasmo afilado, orientados al crecimiento de la cuenta.
  - Añade a cada objeto de generatedTweets el campo "thread" (array, vacío por defecto).`

const GROWTH_SPEC = `MECÁNICAS DE CRECIMIENTO VIRAL (añádelas SIEMPRE al JSON):
  - Añade a CADA objeto de "generatedTweets" el campo "firstSelfReply": una autorespuesta breve (≤280) para publicar tú mismo justo debajo del post y arrancar los comentarios (dato extra, pregunta abierta o CTA que invite a responder).
  - Añade al NIVEL RAÍZ del JSON un objeto "growth" con esta forma EXACTA:
    "growth": {
      "topBanners": ["TITULAR 1 EN MAYÚSCULAS", "TITULAR 2 EN MAYÚSCULAS", "TITULAR 3 EN MAYÚSCULAS"],
      "loopOutro": "frase de cierre que conecta el final del contenido con su primer segundo para maximizar el loop y el watch time",
      "replyStrategy": "consejo de 1 frase para maximizar el ratio de respuestas/debate"
    }
  Los topBanners son ganchos de overlay para video: cortos, punchy, en MAYÚSCULAS.`

// ----------------------------- Metrics -----------------------------
async function getMetrics(database) {
  const doc = await database.collection('metrics').findOne({ _id: 'global' })
  const posts = doc?.posts || 0
  const diagnostics = doc?.diagnostics || 0
  return { posts, diagnostics, hours_saved: Math.round((posts * 0.5 + diagnostics * 0.25) * 100) / 100 }
}

async function bumpMetrics(database, posts = 0, diagnostics = 0) {
  await database.collection('metrics').updateOne({ _id: 'global' }, { $inc: { posts, diagnostics } }, { upsert: true })
  return getMetrics(database)
}

// ----------------------------- Helpers -----------------------------
function normalizeTweet(t, fallbackAuthor = null) {
  const author = t?.author || fallbackAuthor || {}
  return {
    id: t?.id || uuidv4(),
    url: t?.url || t?.twitterUrl || '',
    text: t?.text || '',
    likes: t?.likeCount ?? 0,
    retweets: t?.retweetCount ?? 0,
    replies: t?.replyCount ?? 0,
    quotes: t?.quoteCount ?? 0,
    views: t?.viewCount ?? 0,
    bookmarks: t?.bookmarkCount ?? 0,
    createdAt: t?.createdAt || '',
    lang: t?.lang || '',
    author: {
      name: author?.name || '',
      userName: author?.userName || '',
      profilePicture: author?.profilePicture || '',
    },
  }
}

function engagementScore(t) {
  // Score compuesto: Views*0.05 + Likes*1 + RT*2 + Replies*1.5 + Quotes*3
  return (t.views || 0) * 0.05 + (t.likes || 0) + (t.retweets || 0) * 2 + (t.replies || 0) * 1.5 + (t.quotes || 0) * 3
}

// Agrupa tweets en ventanas de 2 horas (UTC) y devuelve los mejores horarios por engagement
function computePrimeTimes(tweets) {
  const buckets = {}
  for (const t of tweets) {
    const d = t?.createdAt ? new Date(t.createdAt) : null
    if (!d || isNaN(d)) continue
    const start = Math.floor(d.getUTCHours() / 2) * 2
    const key = start
    if (!buckets[key]) buckets[key] = { window: `${String(start).padStart(2, '0')}:00–${String(start + 2).padStart(2, '0')}:00 UTC`, count: 0, score: 0 }
    buckets[key].count += 1
    buckets[key].score += engagementScore(t)
  }
  return Object.values(buckets).sort((a, b) => b.score - a.score).slice(0, 3).map((b) => ({ ...b, score: Math.round(b.score) }))
}

async function twitterGet(path, params) {
  const url = new URL(TWITTER_BASE + path)
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { headers: { 'X-API-Key': TWITTER_KEY } })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Twitter API error (${res.status}): ${txt.slice(0, 200)}`)
  }
  return res.json()
}

async function getUserData(userName) {
  const clean = userName.replace('@', '').trim()
  // 1) Motor top-performing: advanced_search from:usuario (queryType Top)
  const [infoRes, topRes] = await Promise.all([
    twitterGet('/twitter/user/info', { userName: clean }),
    twitterGet('/twitter/tweet/advanced_search', { query: `from:${clean}`, queryType: 'Top' }).catch(() => ({ tweets: [] })),
  ])
  const info = infoRes?.data || {}
  const authorFallback = { name: info?.name, userName: info?.userName, profilePicture: info?.profilePicture }
  let raw = (topRes?.tweets || []).filter((t) => t?.text && !t?.isReply)
  // 2) Fallback a last_tweets si advanced_search no devuelve resultados
  if (raw.length === 0) {
    const tweetsRes = await twitterGet('/twitter/user/last_tweets', { userName: clean }).catch(() => ({}))
    raw = (tweetsRes?.data?.tweets || []).filter((t) => t?.text && !t?.isReply)
  }
  const tweets = raw.map((t) => normalizeTweet(t, authorFallback))
  return { info, tweets }
}

async function getTopicData(query, minFaves) {
  const q = `${query} min_faves:${minFaves}`
  const res = await twitterGet('/twitter/tweet/advanced_search', { query: q, queryType: 'Latest' })
  const rawTweets = res?.tweets || []
  return rawTweets.filter((t) => t?.text && !t?.isReply).map((t) => normalizeTweet(t))
}

// ----------------------------- Gemini -----------------------------
async function rawGeminiJSON(messages, temperature = 0.85) {
  const res = await fetch(`${LLM_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: LLM_MODEL, messages, response_format: { type: 'json_object' }, temperature }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Gemini API error (${res.status}): ${txt.slice(0, 200)}`)
  }
  const data = await res.json()
  let content = data?.choices?.[0]?.message?.content || '{}'
  content = content.replace(/```json/gi, '').replace(/```/g, '').trim()
  return JSON.parse(content)
}

async function callGemini(prompt, temperature = 0.85) {
  return rawGeminiJSON([{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }], temperature)
}

function buildPrompt(mode, query, tweets) {
  const context = tweets
    .map((t, i) => `#${i + 1} [❤️ ${t.likes} | 🔁 ${t.retweets} | 💬 ${t.replies} | 👁️ ${t.views}]\n"${t.text}"`)
    .join('\n\n')
  const focus =
    mode === 'user'
      ? `los tweets recientes del perfil "${query}"`
      : `los tweets virales de alto engagement sobre la temática "${query}"`
  return `Eres un experto en marketing viral y copywriting para X (Twitter). A continuación te doy ${focus} que han funcionado bien:

${context}

TU TAREA (2 fases):

FASE 1 - ANÁLISIS DE PATRONES: Identifica POR QUÉ funcionaron estos tweets. Analiza la estructura del gancho, la longitud óptima, el tono, el formato y los elementos emocionales/psicológicos.

FASE 2 - INGENIERÍA INVERSA VIRAL: Genera EXACTAMENTE 3 propuestas de tweets nuevos, originales y optimizados, aplicando los patrones ganadores. Cada uno en un estilo diferente:
  1. Un Tweet Educativo / Lista
  2. Un Tweet Provocativo / Opinión
  3. Un Tweet Directo / Gancho corto

${SCORE_SPEC}

${COPY_RULES}

${GROWTH_SPEC}

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura EXACTA (en español):
{
  "patternAnalysis": {
    "summary": "...", "hook": "...", "tone": "...", "length": "...", "format": "...",
    "keyPatterns": ["patrón 1", "patrón 2", "patrón 3", "patrón 4"]
  },
  "generatedTweets": [
    { "style": "Educativo / Lista", "text": "...", "rationale": "...", "hookStrength": 87, "retention": "Alta", "weakPoint": "...", "thread": [] },
    { "style": "Provocativo / Opinión", "text": "...", "rationale": "...", "hookStrength": 82, "retention": "Media", "weakPoint": "...", "thread": [] },
    { "style": "Directo / Gancho corto", "text": "...", "rationale": "...", "hookStrength": 90, "retention": "Alta", "weakPoint": "...", "thread": [] }
  ]
}

Los tweets deben estar en español, ser auténticos, sin hashtags excesivos, listos para copiar y pegar.`
}

function buildVisionPrompt(note, transcript) {
  return `Eres un experto en marketing viral para X. Analiza el material adjunto (puede incluir una imagen/fotograma de video y/o la transcripción del audio) y crea contenido listo para publicar.

${note ? `Contexto/instrucción del usuario: "${note}"` : ''}
${transcript ? `TRANSCRIPCIÓN DEL AUDIO (extraída del video o clip de audio):\n"""${transcript}"""` : 'No hay audio disponible en este material.'}

TAREAS:
1. VISIÓN (si hay imagen): extrae contexto visual, sujetos, texto sobreimpreso (OCR) y tono visual.
2. AUDIO (si hay transcripción): resume las frases/quotes clave y detecta el tono/ambiente sonoro (ej. música enérgica, diálogo conversacional, explicación tutorial, ruido ambiente).
3. FUSIÓN: combina el contexto visual + audio en un ángulo de gancho unificado de alta retención.
4. GENERACIÓN: crea EXACTAMENTE 3 posts para X inspirados en el material, en estilos distintos (Educativo / Lista, Provocativo / Opinión, Directo / Gancho corto).

${SCORE_SPEC}

${COPY_RULES}

${GROWTH_SPEC}

Responde ÚNICAMENTE con JSON válido con esta estructura EXACTA (en español):
{
  "vision": { "description": "...", "ocr": "texto detectado o cadena vacía", "tone": "...", "subjects": ["...", "..."] },
  "audio": { "transcript": "resumen o transcripción del audio (cadena vacía si no hay)", "keyQuotes": ["frase clave 1", "frase clave 2"], "tone": "tono/ambiente sonoro (o 'Sin audio')" },
  "combined_hook_angle": "ángulo de gancho unificado audio+visual",
  "patternAnalysis": {
    "summary": "por qué este enfoque puede funcionar en X",
    "hook": "...", "tone": "...", "length": "...", "format": "...",
    "keyPatterns": ["...", "...", "..."]
  },
  "generatedTweets": [
    { "style": "Educativo / Lista", "text": "...", "rationale": "...", "hookStrength": 88, "retention": "Alta", "weakPoint": "...", "thread": [] },
    { "style": "Provocativo / Opinión", "text": "...", "rationale": "...", "hookStrength": 84, "retention": "Media", "weakPoint": "...", "thread": [] },
    { "style": "Directo / Gancho corto", "text": "...", "rationale": "...", "hookStrength": 91, "retention": "Alta", "weakPoint": "...", "thread": [] }
  ]
}`
}

// Transcripción de audio/video vía Whisper (proxy Emergent, OpenAI-compatible)
async function transcribeBuffer(buf, mime, ext) {
  if (buf.length > 25 * 1024 * 1024) throw new Error('El archivo supera el límite de 25MB para transcripción')
  const form = new FormData()
  form.append('model', 'whisper-1')
  form.append('response_format', 'json')
  form.append('file', new Blob([buf], { type: mime }), `media.${ext}`)
  const res = await fetch(`${LLM_BASE}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${LLM_KEY}` }, body: form })
  if (!res.ok) { const t = await res.text(); throw new Error(`Whisper error (${res.status}): ${t.slice(0, 200)}`) }
  const j = await res.json()
  return j?.text || ''
}

async function transcribeMedia(dataUrl) {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/s)
  if (!m) return ''
  const mime = m[1]
  const buf = Buffer.from(m[2], 'base64')
  const ext = mime.includes('wav') ? 'wav' : mime.includes('mp4') ? 'mp4' : mime.includes('quicktime') || mime.includes('mov') ? 'mov' : mime.includes('webm') ? 'webm' : 'mp3'
  return transcribeBuffer(buf, mime, ext)
}

// ----------------------------- Instagram (RapidAPI) -----------------------------
function isInstagramUrl(u) {
  return /^https?:\/\/(www\.)?instagram\.com\/(reel|reels|p|tv)\/[\w\-]+/i.test(u || '')
}

async function igExtract(url) {
  const host = process.env.RAPIDAPI_HOST_INSTAGRAM
  const api = `https://${host}/unified/url?url=${encodeURIComponent(url)}`
  const r = await fetch(api, { headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': host }, cache: 'no-store' })
  let json = {}
  try { json = await r.json() } catch (e) {}
  if (!r.ok || !json?.success) {
    const msg = json?.error?.message || `No se pudo extraer el contenido de Instagram (${r.status})`
    const err = new Error(msg)
    err.status = r.status === 403 ? 403 : 422
    throw err
  }
  const content = json?.data?.content || {}
  let mp4Url = content.media_url || null
  let thumbnail = content.thumbnail_url || null
  if (!mp4Url && Array.isArray(content.items)) {
    const v = content.items.find((i) => i?.media_url)
    mp4Url = v?.media_url || null
    thumbnail = thumbnail || v?.thumbnail_url || null
  }
  return { mp4Url, thumbnail, caption: json?.data?.title || '', mediaType: json?.media_type || 'video' }
}

const TEMPLATE_LABELS = {
  thread: 'Thread Starter (inicio de hilo que engancha a seguir leyendo)',
  controversy: 'Controversia / Opinión Polémica (postura contundente que genera debate)',
  myth: 'Mito vs Realidad (desmonta una creencia común del nicho)',
}

function buildTemplatePrompt(format, topic) {
  const label = TEMPLATE_LABELS[format] || 'Post viral'
  return `Eres un copywriter viral senior para X. Genera EXACTAMENTE 3 propuestas de posts en formato "${label}" sobre la temática: "${topic}".

Requisitos de formato: usa listas con emojis cuando aporten valor, saltos de línea limpios, ganchos potentes en la primera línea, y un cierre con llamada a la interacción. En español, listo para copiar y pegar, sin hashtags excesivos.

${SCORE_SPEC}

${COPY_RULES}

${GROWTH_SPEC}

Responde ÚNICAMENTE con JSON válido con esta estructura EXACTA:
{
  "patternAnalysis": {
    "summary": "por qué el formato ${label} funciona para '${topic}'",
    "hook": "...", "tone": "...", "length": "...", "format": "${label}",
    "keyPatterns": ["...", "...", "..."]
  },
  "generatedTweets": [
    { "style": "Variante 1", "text": "...", "rationale": "...", "hookStrength": 88, "retention": "Alta", "weakPoint": "...", "thread": [] },
    { "style": "Variante 2", "text": "...", "rationale": "...", "hookStrength": 85, "retention": "Media", "weakPoint": "...", "thread": [] },
    { "style": "Variante 3", "text": "...", "rationale": "...", "hookStrength": 90, "retention": "Alta", "weakPoint": "...", "thread": [] }
  ]
}`
}

// ----------------------------- Routes -----------------------------
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const database = await connectToMongo()

    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'ZMETA-AI Viral Engine API OK' }))
    }

    // Alertas proactivas
    if (route === '/alerts' && method === 'GET') {
      const { searchParams } = new URL(request.url)
      const topic = searchParams.get('topic') || 'tu nicho'
      return handleCORS(NextResponse.json({ alerts: buildAlerts(topic) }))
    }

    // Métricas
    if (route === '/metrics' && method === 'GET') {
      return handleCORS(NextResponse.json(await getMetrics(database)))
    }

    // Endpoint principal (perfil / temática)
    if (route === '/analyze-and-generate' && method === 'POST') {
      const body = await request.json()
      const type = body?.type
      const query = (body?.query || '').trim()
      const minFaves = Number(body?.minFaves) > 0 ? Number(body.minFaves) : 100

      if (!type || !['user', 'topic'].includes(type)) {
        return handleCORS(NextResponse.json({ error: "El campo 'type' debe ser 'user' o 'topic'" }, { status: 400 }))
      }
      if (!query) {
        return handleCORS(NextResponse.json({ error: "El campo 'query' es obligatorio" }, { status: 400 }))
      }

      let originalTweets = []
      let userInfo = null

      if (type === 'user') {
        const { info, tweets } = await getUserData(query)
        userInfo = {
          name: info?.name || '',
          userName: info?.userName || query.replace('@', ''),
          description: info?.description || '',
          followers: info?.followers ?? 0,
          following: info?.following ?? 0,
          profilePicture: info?.profilePicture || '',
          isBlueVerified: info?.isBlueVerified || false,
        }
        originalTweets = tweets
      } else {
        originalTweets = await getTopicData(query, minFaves)
      }

      originalTweets = originalTweets.sort((a, b) => engagementScore(b) - engagementScore(a)).slice(0, 10)

      if (originalTweets.length === 0) {
        return handleCORS(
          NextResponse.json(
            {
              error:
                type === 'user'
                  ? 'No se encontraron tweets para ese usuario. Verifica el @username.'
                  : 'No se encontraron tweets con ese engagement. Prueba con otra temática o baja el mínimo de likes.',
            },
            { status: 404 }
          )
        )
      }

      const analysis = await callGemini(buildPrompt(type, query, originalTweets))
      const metrics = await bumpMetrics(database, 3, 1)
      const primeTimes = computePrimeTimes(originalTweets)

      const result = { id: uuidv4(), mode: type, query, minFaves: type === 'topic' ? minFaves : null, userInfo, originalTweets, analysis, growth: analysis?.growth || null, primeTimes, metrics, createdAt: new Date() }
      await database.collection('analyses').insertOne({ ...result })
      const { _id, ...clean } = result
      return handleCORS(NextResponse.json(clean))
    }

    // FASE 1: Motor Audiovisual (imagen/fotograma + transcripción de audio)
    if (route === '/vision-generate' && method === 'POST') {
      const body = await request.json()
      const image = body?.image
      const media = body?.media
      const note = (body?.note || '').trim()
      const hasImage = typeof image === 'string' && image.startsWith('data:')
      const hasMedia = typeof media === 'string' && media.startsWith('data:')
      if (!hasImage && !hasMedia) {
        return handleCORS(NextResponse.json({ error: "Se requiere 'image' o 'media' (data URL)" }, { status: 400 }))
      }

      // 1) Transcripción de audio (video o audio) vía Whisper
      let transcript = ''
      let transcriptError = null
      if (hasMedia) {
        try { transcript = await transcribeMedia(media) } catch (e) { transcriptError = e?.message || 'Transcripción no disponible' }
      }

      // 2) Fusión audio + visión con Gemini
      const userContent = [{ type: 'text', text: buildVisionPrompt(note, transcript) }]
      if (hasImage) userContent.push({ type: 'image_url', image_url: { url: image } })

      const result = await rawGeminiJSON([{ role: 'system', content: SYSTEM }, { role: 'user', content: userContent }], 0.85)
      const metrics = await bumpMetrics(database, 3, 1)

      const audio = result?.audio || { transcript: '', keyQuotes: [], tone: 'Sin audio' }
      if (transcript && !audio.transcript) audio.transcript = transcript
      if (transcriptError) audio.error = transcriptError

      const payload = {
        id: uuidv4(),
        mode: 'media',
        vision: result?.vision || null,
        audio,
        combined_hook_angle: result?.combined_hook_angle || '',
        analysis: { patternAnalysis: result?.patternAnalysis || null, generatedTweets: result?.generatedTweets || [] },
        growth: result?.growth || null,
        metrics,
        createdAt: new Date(),
      }
      await database.collection('analyses').insertOne({ ...payload })
      const { _id, ...clean } = payload
      return handleCORS(NextResponse.json(clean))
    }

    // FASE 2.1: Express solo-texto (plantillas de 1 clic)
    if (route === '/text-template' && method === 'POST') {
      const body = await request.json()
      const format = body?.format
      const topic = (body?.topic || '').trim()
      if (!format || !['thread', 'controversy', 'myth'].includes(format)) {
        return handleCORS(NextResponse.json({ error: "Formato inválido (thread|controversy|myth)" }, { status: 400 }))
      }
      if (!topic) {
        return handleCORS(NextResponse.json({ error: "El campo 'topic' es obligatorio" }, { status: 400 }))
      }
      const analysis = await callGemini(buildTemplatePrompt(format, topic), 0.9)
      const metrics = await bumpMetrics(database, 3, 1)
      return handleCORS(NextResponse.json({ id: uuidv4(), mode: 'text', format, query: topic, analysis, growth: analysis?.growth || null, metrics }))
    }

    // FASE 3.1 / rewrite
    if (route === '/rewrite' && method === 'POST') {
      const body = await request.json()
      const text = (body?.text || '').trim()
      const weakPoint = (body?.weakPoint || '').trim()
      const style = (body?.style || 'General').trim()
      if (!text) {
        return handleCORS(NextResponse.json({ error: "El campo 'text' es obligatorio" }, { status: 400 }))
      }
      const rewritePrompt = `Eres un copywriter viral senior para X. Reescribe y MEJORA el siguiente tweet corrigiendo específicamente su punto débil, manteniendo el estilo "${style}" y el mismo idioma.

TWEET ORIGINAL:
"${text}"

PUNTO DÉBIL A CORREGIR:
"${weakPoint || 'Mejora el gancho y la retención general.'}"

Devuelve ÚNICAMENTE un JSON con esta estructura EXACTA:
{
  "text": "nuevo tweet mejorado listo para publicar",
  "rationale": "qué cambiaste y por qué mejora el rendimiento",
  "hookStrength": 92,
  "retention": "Alta",
  "weakPoint": "punto débil residual (o 'Ninguno relevante')"
}`
      const rewritten = await callGemini(rewritePrompt, 0.9)
      const metrics = await bumpMetrics(database, 1, 0)
      return handleCORS(NextResponse.json({ ...rewritten, metrics }))
    }

    // FASE 2.2: Programar publicación (cola de borradores)
    if (route === '/schedule' && method === 'POST') {
      const body = await request.json()
      const text = (body?.text || '').trim()
      if (!text) {
        return handleCORS(NextResponse.json({ error: "El campo 'text' es obligatorio" }, { status: 400 }))
      }
      const hasMedia = !!body?.hasMedia
      const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : new Date(Date.now() + 3600 * 1000)
      const draft = { id: uuidv4(), text, hasMedia, style: body?.style || '', scheduledAt, status: 'scheduled', createdAt: new Date() }
      await database.collection('scheduled').insertOne({ ...draft })
      const count = await database.collection('scheduled').countDocuments({ status: 'scheduled' })
      const { _id, ...clean } = draft
      return handleCORS(NextResponse.json({ draft: clean, count }))
    }

    if (route === '/schedule' && method === 'GET') {
      const items = await database.collection('scheduled').find({}).sort({ scheduledAt: 1 }).limit(50).toArray()
      const cleaned = items.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json({ items: cleaned, count: cleaned.length }))
    }

    // Instagram: extraer metadatos + MP4 (RapidAPI 7scorp)
    if (route === '/instagram/download' && method === 'POST') {
      const body = await request.json()
      const url = (body?.url || '').trim()
      if (!isInstagramUrl(url)) {
        return handleCORS(NextResponse.json({ error: 'URL de Instagram no válida. Usa un enlace de reel/p/tv.' }, { status: 400 }))
      }
      try {
        const data = await igExtract(url)
        if (!data.mp4Url) {
          return handleCORS(NextResponse.json({ error: 'No se encontró vídeo MP4 en ese enlace (¿es una foto o cuenta privada?).' }, { status: 422 }))
        }
        return handleCORS(NextResponse.json({ ok: true, url, ...data }))
      } catch (e) {
        return handleCORS(NextResponse.json({ error: e?.message || 'Fallo al extraer de Instagram' }, { status: e?.status || 502 }))
      }
    }

    // Instagram: proxy de descarga (fuerza attachment, evita CORS)
    if (route === '/instagram/proxy' && method === 'GET') {
      const { searchParams } = new URL(request.url)
      const u = searchParams.get('url')
      if (!u) return handleCORS(NextResponse.json({ error: 'url requerido' }, { status: 400 }))
      const rr = await fetch(u)
      if (!rr.ok) return handleCORS(NextResponse.json({ error: 'No se pudo descargar el vídeo' }, { status: 502 }))
      const headers = new Headers()
      headers.set('Content-Type', rr.headers.get('content-type') || 'video/mp4')
      headers.set('Content-Disposition', 'attachment; filename="viralforge-reel.mp4"')
      headers.set('Access-Control-Allow-Origin', '*')
      return new NextResponse(rr.body, { status: 200, headers })
    }

    // Instagram: descargar + transcribir (Whisper) + visión (thumbnail) + generar
    if (route === '/instagram/analyze' && method === 'POST') {
      const body = await request.json()
      const url = (body?.url || '').trim()
      const note = (body?.note || '').trim()
      if (!isInstagramUrl(url)) {
        return handleCORS(NextResponse.json({ error: 'URL de Instagram no válida.' }, { status: 400 }))
      }
      let meta
      try { meta = await igExtract(url) } catch (e) { return handleCORS(NextResponse.json({ error: e?.message || 'Fallo al extraer de Instagram' }, { status: e?.status || 502 })) }
      if (!meta.mp4Url) return handleCORS(NextResponse.json({ error: 'No se encontró vídeo MP4 en ese enlace.' }, { status: 422 }))

      // Transcripción del audio del reel
      let transcript = '', transcriptError = null
      try {
        const vr = await fetch(meta.mp4Url)
        const buf = Buffer.from(await vr.arrayBuffer())
        if (buf.length <= 25 * 1024 * 1024) transcript = await transcribeBuffer(buf, 'video/mp4', 'mp4')
        else transcriptError = 'Vídeo >25MB: audio no transcrito'
      } catch (e) { transcriptError = e?.message || 'Transcripción no disponible' }

      // Thumbnail como contexto visual
      let image = null
      try {
        if (meta.thumbnail) {
          const tr = await fetch(meta.thumbnail)
          const tb = Buffer.from(await tr.arrayBuffer())
          const mt = tr.headers.get('content-type') || 'image/jpeg'
          image = `data:${mt};base64,${tb.toString('base64')}`
        }
      } catch (e) {}

      const userContent = [{ type: 'text', text: buildVisionPrompt(note || meta.caption, transcript) }]
      if (image) userContent.push({ type: 'image_url', image_url: { url: image } })
      const result = await rawGeminiJSON([{ role: 'system', content: SYSTEM }, { role: 'user', content: userContent }], 0.85)
      const metrics = await bumpMetrics(database, 3, 1)
      const audio = result?.audio || { transcript: '', keyQuotes: [], tone: 'Sin audio' }
      if (transcript && !audio.transcript) audio.transcript = transcript
      if (transcriptError) audio.error = transcriptError

      const payload = {
        id: uuidv4(), mode: 'media', source: 'instagram', igUrl: url, mp4Url: meta.mp4Url, thumbnail: meta.thumbnail, caption: meta.caption,
        vision: result?.vision || null, audio, combined_hook_angle: result?.combined_hook_angle || '',
        analysis: { patternAnalysis: result?.patternAnalysis || null, generatedTweets: result?.generatedTweets || [] },
        growth: result?.growth || null, metrics, createdAt: new Date(),
      }
      await database.collection('analyses').insertOne({ ...payload })
      const { _id, ...clean } = payload
      return handleCORS(NextResponse.json(clean))
    }

    // Historial
    if (route === '/history' && method === 'GET') {
      const items = await database.collection('analyses').find({}).sort({ createdAt: -1 }).limit(20).toArray()
      const cleaned = items.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
