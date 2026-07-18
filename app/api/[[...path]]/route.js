import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { buildAlerts } from '@/lib/constants/alerts'

// ----------------------------- MongoDB -----------------------------
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
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

// ----------------------------- Metrics (Tiempo Recuperado) -----------------------------
// H_saved = posts * 0.5 + diagnostics * 0.25 (horas)
async function getMetrics(database) {
  const doc = await database.collection('metrics').findOne({ _id: 'global' })
  const posts = doc?.posts || 0
  const diagnostics = doc?.diagnostics || 0
  return {
    posts,
    diagnostics,
    hours_saved: Math.round((posts * 0.5 + diagnostics * 0.25) * 100) / 100,
  }
}

async function bumpMetrics(database, posts = 0, diagnostics = 0) {
  await database
    .collection('metrics')
    .updateOne({ _id: 'global' }, { $inc: { posts, diagnostics } }, { upsert: true })
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
  return (t.likes || 0) + (t.retweets || 0) * 2 + (t.replies || 0) + (t.quotes || 0)
}

async function twitterGet(path, params) {
  const url = new URL(TWITTER_BASE + path)
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { 'X-API-Key': TWITTER_KEY },
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Twitter API error (${res.status}): ${txt.slice(0, 200)}`)
  }
  return res.json()
}

async function getUserData(userName) {
  const clean = userName.replace('@', '').trim()
  const [infoRes, tweetsRes] = await Promise.all([
    twitterGet('/twitter/user/info', { userName: clean }),
    twitterGet('/twitter/user/last_tweets', { userName: clean }),
  ])
  const info = infoRes?.data || {}
  const rawTweets = tweetsRes?.data?.tweets || []
  const authorFallback = {
    name: info?.name,
    userName: info?.userName,
    profilePicture: info?.profilePicture,
  }
  const tweets = rawTweets
    .filter((t) => t?.text && !t?.isReply)
    .map((t) => normalizeTweet(t, authorFallback))
  return { info, tweets }
}

async function getTopicData(query, minFaves) {
  const q = `${query} min_faves:${minFaves}`
  const res = await twitterGet('/twitter/tweet/advanced_search', {
    query: q,
    queryType: 'Latest',
  })
  const rawTweets = res?.tweets || []
  return rawTweets.filter((t) => t?.text && !t?.isReply).map((t) => normalizeTweet(t))
}

// ----------------------------- Gemini -----------------------------
function buildPrompt(mode, query, tweets) {
  const context = tweets
    .map((t, i) => {
      return `#${i + 1} [❤️ ${t.likes} | 🔁 ${t.retweets} | 💬 ${t.replies} | 👁️ ${t.views}]\n"${t.text}"`
    })
    .join('\n\n')

  const focus =
    mode === 'user'
      ? `los tweets recientes del perfil "${query}"`
      : `los tweets virales de alto engagement sobre la temática "${query}"`

  return `Eres un experto en marketing viral y copywriting para X (Twitter). A continuación te doy ${focus} que han funcionado bien:

${context}

TU TAREA (2 fases):

FASE 1 - ANÁLISIS DE PATRONES: Identifica POR QUÉ funcionaron estos tweets. Analiza la estructura del gancho, la longitud óptima, el tono, el formato y los elementos emocionales/psicológicos que generan engagement.

FASE 2 - INGENIERÍA INVERSA VIRAL: Genera EXACTAMENTE 3 propuestas de tweets nuevos, originales y optimizados, aplicando los patrones ganadores detectados, sobre la misma temática/estilo. Cada uno en un estilo diferente:
  1. Un Tweet Educativo / Lista (aporta valor, formato de lista o pasos)
  2. Un Tweet Provocativo / Opinión (opinión contundente que genere debate)
  3. Un Tweet Directo / Gancho corto (una sola línea potente e impactante)

Para CADA tweet generado calcula además un SCORE DE VIRALIDAD PREDICTIVO realista:
  - hookStrength: entero 0-100 (fuerza del gancho en la primera línea)
  - retention: "Alta" | "Media" | "Baja" (retención estimada del lector)
  - weakPoint: una frase corta señalando el punto débil o mayor área de mejora del tweet

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura EXACTA (en español):
{
  "patternAnalysis": {
    "summary": "resumen de 2-3 frases sobre por qué funcionan estos tweets",
    "hook": "descripción breve de la estructura del gancho más usado",
    "tone": "tono predominante detectado",
    "length": "longitud óptima observada",
    "format": "formato predominante (hilo, lista, one-liner, pregunta, etc.)",
    "keyPatterns": ["patrón 1", "patrón 2", "patrón 3", "patrón 4"]
  },
  "generatedTweets": [
    { "style": "Educativo / Lista", "text": "texto listo para publicar", "rationale": "por qué funcionará", "hookStrength": 87, "retention": "Alta", "weakPoint": "El segundo párrafo rompe la curiosidad." },
    { "style": "Provocativo / Opinión", "text": "texto listo para publicar", "rationale": "por qué funcionará", "hookStrength": 82, "retention": "Media", "weakPoint": "..." },
    { "style": "Directo / Gancho corto", "text": "texto listo para publicar", "rationale": "por qué funcionará", "hookStrength": 90, "retention": "Alta", "weakPoint": "..." }
  ]
}

Los tweets generados deben estar en el mismo idioma que los tweets modelo, ser auténticos, no genéricos, sin hashtags excesivos, y listos para copiar y pegar.`
}

async function callGemini(prompt, temperature = 0.85) {
  const res = await fetch(`${LLM_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LLM_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Eres un analista de contenido viral y copywriter senior para X. Siempre respondes con JSON válido, sin markdown, sin texto adicional.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature,
    }),
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

    // ---- FASE 1: Alertas proactivas ("Trend Catching") ----
    if (route === '/alerts' && method === 'GET') {
      const { searchParams } = new URL(request.url)
      const topic = searchParams.get('topic') || 'tu nicho'
      const alerts = buildAlerts(topic)
      return handleCORS(NextResponse.json({ alerts }))
    }

    // ---- FASE 1: Métricas de Tiempo Recuperado ----
    if (route === '/metrics' && method === 'GET') {
      const metrics = await getMetrics(database)
      return handleCORS(NextResponse.json(metrics))
    }

    // ---- Endpoint principal ----
    if (route === '/analyze-and-generate' && method === 'POST') {
      const body = await request.json()
      const type = body?.type
      const query = (body?.query || '').trim()
      const minFaves = Number(body?.minFaves) > 0 ? Number(body.minFaves) : 100

      if (!type || !['user', 'topic'].includes(type)) {
        return handleCORS(
          NextResponse.json({ error: "El campo 'type' debe ser 'user' o 'topic'" }, { status: 400 })
        )
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

      originalTweets = originalTweets
        .sort((a, b) => engagementScore(b) - engagementScore(a))
        .slice(0, 10)

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

      const prompt = buildPrompt(type, query, originalTweets)
      const analysis = await callGemini(prompt)

      // FASE 1.2: incrementa Tiempo Recuperado (3 posts + 1 diagnóstico)
      const metrics = await bumpMetrics(database, 3, 1)

      const result = {
        id: uuidv4(),
        type,
        query,
        minFaves: type === 'topic' ? minFaves : null,
        userInfo,
        originalTweets,
        analysis,
        metrics,
        createdAt: new Date(),
      }

      await database.collection('analyses').insertOne({ ...result })

      const { _id, ...clean } = result
      return handleCORS(NextResponse.json(clean))
    }

    // ---- FASE 3: Reescritura con IA (corregir punto débil) ----
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

Devuelve ÚNICAMENTE un JSON con esta estructura EXACTA (en el mismo idioma del tweet):
{
  "text": "nuevo tweet mejorado listo para publicar",
  "rationale": "qué cambiaste y por qué mejora el rendimiento",
  "hookStrength": 92,
  "retention": "Alta",
  "weakPoint": "punto débil residual (o 'Ninguno relevante')"
}`

      const rewritten = await callGemini(rewritePrompt, 0.9)

      // reescritura cuenta como 1 post recuperado
      const metrics = await bumpMetrics(database, 1, 0)

      return handleCORS(NextResponse.json({ ...rewritten, metrics }))
    }

    // History
    if (route === '/history' && method === 'GET') {
      const items = await database
        .collection('analyses')
        .find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray()
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
