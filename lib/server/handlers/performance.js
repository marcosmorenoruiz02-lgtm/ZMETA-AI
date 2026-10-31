import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/server/db'
import { fail, json } from '@/lib/server/http'
import { pnum } from '@/lib/server/number'
import { buildPerformanceReport, computeDerivedMetrics, computePerformanceScore, classifyPerformance, reclassifyPerformance } from '@/lib/server/performance'
import { normalizeTweet } from '@/lib/server/tweets'
import { twitterGet } from '@/lib/server/twitter'

function bounded(value, max, label) {
  const text = String(value ?? '').trim()
  if (text.length > max) throw fail(`${label} es demasiado largo (máx. ${max} caracteres).`, 400)
  return text
}

export async function performanceFromUrl(body) {
  const rawUrl = bounded(body?.url, 400, 'La URL')
  const idMatch = rawUrl.match(/status(?:es)?\/(\d+)/) || rawUrl.match(/^(\d{5,25})$/)
  const tweetId = idMatch ? idMatch[1] : null
  if (!tweetId) throw fail('URL de tweet no válida. Pega el enlace de la publicación (…/status/123…).', 400)
  let tw = null
  try {
    const res = await twitterGet('/twitter/tweets', { tweet_ids: tweetId })
    tw = res?.tweets?.[0] || res?.data?.tweets?.[0] || res?.data?.[0] || null
  } catch { tw = null }
  if (!tw) {
    try {
      const safeUrl = rawUrl.replace(/["\\]/g, '')
      const res2 = await twitterGet('/twitter/tweet/advanced_search', { query: `url:${safeUrl}`, queryType: 'Latest' })
      tw = res2?.tweets?.[0] || null
    } catch { tw = null }
  }
  if (!tw) throw fail('No se pudo obtener el tweet. ¿Es público y existe? Si el error persiste, introduce las métricas a mano.', 422)
  const n = normalizeTweet(tw)
  return json({
    ok: true,
    prefill: {
      impressions: n.views || 0,
      likes: n.likes || 0,
      reposts: n.retweets || 0,
      replies: n.replies || 0,
      quotes: n.quotes || 0,
      bookmarks: n.bookmarks || 0,
      text: n.text || '',
    },
    hasVideo: (n.media || []).some((m) => m.type === 'video' || m.videoUrl),
    postId: tweetId,
    note: 'Métricas públicas extraídas de X. Las impresiones equivalen a las visualizaciones públicas. Reproducciones de vídeo y retención son privadas: introdúcelas a mano si las tienes.',
  })
}

export async function createPerformance(body) {
  const impressions = pnum(body?.impressions)
  if (impressions <= 0) throw fail('Las impresiones son obligatorias y deben ser > 0', 400)
  const metrics = {
    impressions,
    likes: pnum(body?.likes),
    reposts: pnum(body?.reposts),
    replies: pnum(body?.replies),
    quotes: pnum(body?.quotes),
    bookmarks: pnum(body?.bookmarks),
    detailExpands: pnum(body?.detailExpands),
    profileVisits: pnum(body?.profileVisits),
    videoViews: pnum(body?.videoViews),
    uniqueVideoViews: pnum(body?.uniqueVideoViews),
    followers: pnum(body?.followers),
    interactions: (body?.interactions != null && body?.interactions !== '') ? pnum(body?.interactions) : null,
    retention: (body?.retention != null && body?.retention !== '') ? pnum(body?.retention) : null,
  }
  const derived = computeDerivedMetrics(metrics)
  const performanceScore = computePerformanceScore(derived, metrics.retention)
  const database = await getDb()
  const existing = await database.collection('post_performance').find({}).toArray()
  const classification = classifyPerformance(performanceScore, [...existing.map((r) => r.performanceScore), performanceScore])
  const rec = {
    id: uuidv4(),
    postId: bounded(body?.postId, 40, 'El id') || null,
    text: bounded(body?.text, 2000, 'El texto'),
    hasVideo: !!(pnum(body?.videoViews) > 0 || body?.hasVideo),
    metrics,
    derived,
    performanceScore,
    classification,
    source: bounded(body?.source || 'manual', 40, 'El origen') || 'manual',
    measuredAt: new Date(),
    createdAt: new Date(),
  }
  await database.collection('post_performance').insertOne({ ...rec })
  const { items, distribution } = await reclassifyPerformance(database)
  const saved = items.find((r) => r.id === rec.id) || rec
  const report = buildPerformanceReport(saved, items, distribution)
  return json({ record: saved, report, items, distribution })
}

export async function listPerformance() {
  const { items, distribution } = await reclassifyPerformance(await getDb())
  return json({ items, distribution })
}

export async function deletePerformance(request) {
  const id = new URL(request.url).searchParams.get('id') || ''
  if (!id) throw fail("Falta el parámetro 'id'", 400)
  if (!/^[\w-]{8,80}$/.test(id)) throw fail('Identificador no válido.', 400)
  const database = await getDb()
  await database.collection('post_performance').deleteOne({ id })
  const { items, distribution } = await reclassifyPerformance(database)
  return json({ ok: true, items, distribution })
}
