import { v4 as uuidv4 } from 'uuid'
import { buildAlerts } from '@/lib/constants/alerts'
import { bumpMetrics, getDb, getMetrics } from '@/lib/server/db'
import { callGemini, generateJSON, generateWithMedia, mediaToPart, SYSTEM, transcribeMedia } from '@/lib/server/gemini'
import { fail, json } from '@/lib/server/http'
import {
  buildBookmarkOptimizePrompt,
  buildPrompt,
  buildPersonalityPrompt,
  buildRewritePrompt,
  buildTemplatePrompt,
  buildVisionPrompt,
  NO_EVIDENCE,
} from '@/lib/server/prompts'
import { computeBookmarkScore, resolveClusterConfig } from '@/lib/server/bookmark'
import { computePrimeTimes, computeViralDNA, engagementScore, enrichGeneratedTweets } from '@/lib/server/tweets'
import { getTopicData, getUserData } from '@/lib/server/twitter'

function bounded(value, max, label) {
  const text = String(value ?? '').trim()
  if (text.length > max) throw fail(`${label} es demasiado largo (máx. ${max} caracteres).`, 400)
  return text
}

async function computePersonality(mode, query, tweets) {
  const imgs = []
  for (const t of tweets) {
    for (const m of t.media || []) {
      const u = m.thumbnail || m.url
      if (u && imgs.length < 5) imgs.push(u)
    }
  }
  try {
    return await generateWithMedia({
      prompt: buildPersonalityPrompt(mode, query, tweets),
      mediaSources: imgs,
      temperature: 0.4,
    })
  } catch (error) {
    console.error('Personalidad no disponible:', error?.message)
    return null
  }
}

export async function root() {
  return json({ message: 'ZMETA-AI Viral Engine API OK' })
}

export async function alerts(request) {
  const topic = new URL(request.url).searchParams.get('topic') || 'tu nicho'
  return json({ alerts: buildAlerts(bounded(topic, 120, 'El tema') || 'tu nicho') })
}

export async function metrics() {
  return json(await getMetrics(await getDb()))
}

export async function history() {
  const items = await (await getDb()).collection('analyses').find({}).sort({ createdAt: -1 }).limit(20).toArray()
  return json(items.map(({ _id, ...rest }) => rest))
}

export async function analyzeAndGenerate(body) {
  const type = body?.type
  const query = bounded(body?.query, 180, 'La consulta')
  const minFavesRaw = Number(body?.minFaves)
  const minFaves = Number.isFinite(minFavesRaw) && minFavesRaw > 0 ? Math.min(minFavesRaw, 1_000_000) : 100
  if (!type || !['user', 'topic'].includes(type)) throw fail("El campo 'type' debe ser 'user' o 'topic'", 400)
  if (!query) throw fail("El campo 'query' es obligatorio", 400)
  const database = await getDb()

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

  const sample = [...originalTweets].sort((a, b) => engagementScore(b) - engagementScore(a)).slice(0, 25)
  originalTweets = sample.slice(0, 10)
  if (sample.length === 0) {
    throw fail(
      type === 'user'
        ? 'No se encontraron tweets para ese usuario. Verifica el @username.'
        : 'No se encontraron tweets con ese engagement. Prueba con otra temática o baja el mínimo de likes.',
      404,
    )
  }

  const personality = await computePersonality(type, query, sample.slice(0, 18))
  const viralDNA = computeViralDNA(sample)
  const analysis = enrichGeneratedTweets(
    await callGemini(buildPrompt(type, query, originalTweets, personality)),
    personality,
    viralDNA,
  )

  let personalityVersion = null
  if (personality && type === 'user') {
    const handle = query.replace('@', '').toLowerCase().trim()
    const prev = await database.collection('digital_personality').find({ handle }).sort({ version: -1 }).limit(1).toArray()
    const last = prev[0] || null
    const version = (last?.version || 0) + 1
    const doc = {
      id: uuidv4(),
      handle,
      version,
      sampleSize: sample.length,
      mediaSampleSize: sample.filter((t) => (t.media || []).length).length,
      weighting: { historical: 0.7, recent: 0.3 },
      personality,
      previousVersion: last?.version || null,
      confidence: viralDNA.available ? 0.7 : 0.4,
      createdAt: new Date(),
    }
    await database.collection('digital_personality').insertOne({ ...doc })
    const { _id, personality: _p, ...meta } = doc
    personalityVersion = meta
  }

  const metricsDoc = await bumpMetrics(database, 3, 1)
  const result = {
    id: uuidv4(),
    mode: type,
    query,
    minFaves: type === 'topic' ? minFaves : null,
    userInfo,
    personality,
    personalityVersion,
    viralDNA,
    originalTweets,
    analysis,
    growth: analysis?.growth || null,
    primeTimes: computePrimeTimes(originalTweets),
    metrics: metricsDoc,
    createdAt: new Date(),
  }
  await database.collection('analyses').insertOne({ ...result })
  const { _id, ...clean } = result
  return json(clean)
}

async function visionFromParts({ note, transcript, transcriptError, imgs, mode = 'media', extra = {} }) {
  const parts = [{ text: buildVisionPrompt(note, transcript, imgs.length) }]
  for (const source of imgs) {
    const part = await mediaToPart(source, { optional: false, maxBytes: 4 * 1024 * 1024 })
    if (part) parts.push(part)
  }
  const result = await generateJSON({ system: SYSTEM, parts, temperature: 0.15 })
  const metricsDoc = await bumpMetrics(await getDb(), 3, 1)
  const audio = result?.audio || { transcript: '', keyQuotes: [], tone: NO_EVIDENCE }
  if (transcript && !audio.transcript) audio.transcript = transcript
  if (transcriptError) audio.error = transcriptError
  const payload = {
    id: uuidv4(),
    mode,
    evidence: result?.evidence || null,
    vision: result?.vision || null,
    audio,
    combined_hook_angle: result?.combined_hook_angle || '',
    analysis: { patternAnalysis: result?.patternAnalysis || null, generatedTweets: result?.generatedTweets || [] },
    growth: result?.growth || null,
    metrics: metricsDoc,
    createdAt: new Date(),
    ...extra,
  }
  await (await getDb()).collection('analyses').insertOne({ ...payload })
  const { _id, ...clean } = payload
  return json(clean)
}

export async function visionGenerate(body) {
  const image = body?.image
  const media = body?.media
  const note = bounded(body?.note, 2000, 'La nota')
  const frames = Array.isArray(body?.frames) ? body.frames.filter((f) => typeof f === 'string' && f.startsWith('data:')).slice(0, 6) : []
  const hasImage = typeof image === 'string' && image.startsWith('data:')
  const hasMedia = typeof media === 'string' && media.startsWith('data:')
  if (!hasImage && !hasMedia && !frames.length) throw fail("Se requiere 'image', 'frames' o 'media' (data URL)", 400)
  await getDb()

  let transcript = ''
  let transcriptError = null
  if (hasMedia) {
    try { transcript = await transcribeMedia(media) } catch (error) { transcriptError = error?.message || 'Transcripción no disponible' }
  }
  const imgs = (frames.length ? frames : (hasImage ? [image] : [])).slice(0, 6)
  return visionFromParts({ note, transcript, transcriptError, imgs })
}

export async function textTemplate(body) {
  const format = body?.format
  const topic = bounded(body?.topic, 180, 'El tema')
  if (!format || !['thread', 'controversy', 'myth'].includes(format)) throw fail('Formato inválido (thread|controversy|myth)', 400)
  if (!topic) throw fail("El campo 'topic' es obligatorio", 400)
  await getDb()
  const analysis = await callGemini(buildTemplatePrompt(format, topic), 0.9)
  const metricsDoc = await bumpMetrics(await getDb(), 3, 1)
  return json({ id: uuidv4(), mode: 'text', format, query: topic, analysis, growth: analysis?.growth || null, metrics: metricsDoc })
}

export async function rewrite(body) {
  const text = bounded(body?.text, 4000, 'El texto')
  const weakPoint = bounded(body?.weakPoint, 500, 'El punto débil')
  const style = bounded(body?.style || 'General', 80, 'El estilo') || 'General'
  if (!text) throw fail("El campo 'text' es obligatorio", 400)
  await getDb()
  const rewritten = await callGemini(buildRewritePrompt(text, weakPoint, style), 0.9)
  const metricsDoc = await bumpMetrics(await getDb(), 1, 0)
  return json({ ...rewritten, metrics: metricsDoc })
}

export async function bookmarkScore(body) {
  const text = typeof body?.text === 'string' ? body.text.slice(0, 8000) : ''
  const cluster = bounded(body?.cluster || 'tech_ai', 80, 'El nicho') || 'tech_ai'
  const hasThread = !!body?.hasThread
  const firstReply = typeof body?.firstReply === 'string' ? body.firstReply.slice(0, 2000) : ''
  return json(computeBookmarkScore(text, cluster, hasThread, firstReply))
}

export async function bookmarkOptimize(body) {
  const text = bounded(body?.text, 4000, 'El texto')
  const cluster = bounded(body?.cluster || 'tech_ai', 80, 'El nicho') || 'tech_ai'
  const firstReply = bounded(body?.firstReply, 1000, 'La respuesta')
  const target = bounded(body?.target, 300, 'La mejora')
  if (!text) throw fail("El campo 'text' es obligatorio", 400)
  if (!target) throw fail("El campo 'target' (mejora a aplicar) es obligatorio", 400)
  const label = resolveClusterConfig(cluster).label
  const improved = await callGemini(buildBookmarkOptimizePrompt({ text, label, firstReply, target }), 0.7)
  return json({ text: improved?.text || text, rationale: improved?.rationale || '', applied: target })
}
