import { avg, clamp, pct, pnum, stddev } from '@/lib/server/number'

export function computeDerivedMetrics(m) {
  const impressions = pnum(m.impressions)
  const likes = pnum(m.likes)
  const reposts = pnum(m.reposts)
  const replies = pnum(m.replies)
  const quotes = pnum(m.quotes)
  const bookmarks = pnum(m.bookmarks)
  const detailExpands = pnum(m.detailExpands)
  const profileVisits = pnum(m.profileVisits)
  const videoViews = pnum(m.videoViews)
  const uniqueVideoViews = pnum(m.uniqueVideoViews)
  const followers = pnum(m.followers)
  const interactions = m.interactions != null && m.interactions !== '' ? pnum(m.interactions) : likes + reposts + replies + quotes + bookmarks
  return {
    interactions,
    engagementRate: pct(interactions, impressions),
    videoViewRate: pct(videoViews, impressions),
    uniqueVideoViewRate: pct(uniqueVideoViews, impressions),
    profileVisitRate: pct(profileVisits, impressions),
    detailExpandRate: pct(detailExpands, impressions),
    bookmarkRate: pct(bookmarks, impressions),
    repostRate: pct(reposts, impressions),
    replyRate: pct(replies, impressions),
    interactionPer1000Impressions: impressions > 0 ? +((interactions / impressions) * 1000).toFixed(2) : null,
    impressionsPerFollower: followers > 0 ? +(impressions / followers).toFixed(3) : null,
  }
}

export function computePerformanceScore(d, retention) {
  const parts = []
  const add = (val, cap, w) => { if (val != null && !Number.isNaN(val)) parts.push({ s: clamp((val / cap) * 100), w }) }
  add(d.engagementRate, 8, 0.28)
  add(d.videoViewRate, 120, 0.10)
  add(retention != null ? pnum(retention) : null, 60, 0.17)
  add(d.profileVisitRate, 2, 0.08)
  add(d.bookmarkRate, 2, 0.09)
  add(d.repostRate, 2, 0.08)
  add(d.impressionsPerFollower, 5, 0.20)
  const tw = parts.reduce((a, p) => a + p.w, 0) || 1
  return clamp(parts.reduce((a, p) => a + p.s * p.w, 0) / tw)
}

export function classifyPerformance(score, allScores) {
  const usable = allScores.filter((s) => typeof s === 'number')
  if (usable.length >= 5) {
    const m = avg(usable)
    const sd = stddev(usable)
    if (sd > 0) {
      const z = (score - m) / sd
      if (z >= 2) return 'OUTLIER'
      if (z >= 1) return 'HIGH'
      if (z >= 0.25) return 'ABOVE_AVERAGE'
      if (z > -0.75) return 'NORMAL'
      return 'LOW'
    }
  }
  if (score >= 85) return 'OUTLIER'
  if (score >= 70) return 'HIGH'
  if (score >= 55) return 'ABOVE_AVERAGE'
  if (score >= 35) return 'NORMAL'
  return 'LOW'
}

export async function reclassifyPerformance(database) {
  const all = await database.collection('post_performance').find({}).toArray()
  const scores = all.map((r) => r.performanceScore)
  for (const r of all) {
    const cls = classifyPerformance(r.performanceScore, scores)
    if (cls !== r.classification) await database.collection('post_performance').updateOne({ id: r.id }, { $set: { classification: cls } })
  }
  const cleaned = all.map(({ _id, ...rest }) => ({ ...rest, classification: classifyPerformance(rest.performanceScore, scores) }))
  cleaned.sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0))
  const engRates = cleaned.map((r) => r.derived?.engagementRate).filter((x) => x != null)
  return {
    items: cleaned,
    distribution: {
      count: cleaned.length,
      avgScore: +avg(scores).toFixed(1),
      maxScore: cleaned.length ? Math.max(...scores) : 0,
      avgEngagementRate: engRates.length ? +avg(engRates).toFixed(2) : null,
      basis: cleaned.length >= 5 ? 'relative' : 'absolute',
    },
  }
}

export function buildPerformanceReport(rec, items, distribution) {
  const d = rec.derived
  const scores = items.map((r) => r.performanceScore)
  const better = scores.filter((s) => rec.performanceScore >= s).length
  const percentile = items.length ? Math.round((better / items.length) * 100) : 100
  const vsAvgEng = (distribution.avgEngagementRate != null && d.engagementRate != null)
    ? +((d.engagementRate - distribution.avgEngagementRate)).toFixed(2) : null

  const observations = []
  observations.push(`Impresiones ${pnum(rec.metrics.impressions).toLocaleString('es')} · Interacciones ${d.interactions.toLocaleString('es')} · Engagement ${d.engagementRate ?? 'n/d'}%`)
  if (d.videoViewRate != null) observations.push(`Reproducciones ${pnum(rec.metrics.videoViews).toLocaleString('es')} (${d.videoViewRate}% de impresiones)`)
  if (rec.metrics.retention != null && rec.metrics.retention !== '') observations.push(`Retención de vídeo declarada: ${pnum(rec.metrics.retention)}%`)
  if (d.profileVisitRate != null) observations.push(`Visitas al perfil: ${pnum(rec.metrics.profileVisits).toLocaleString('es')} (${d.profileVisitRate}%)`)

  const comparison = []
  if (items.length >= 2) {
    comparison.push(`Este post está en el percentil ${percentile} de tu cuenta (${items.length} posts medidos).`)
    if (vsAvgEng != null) {
      comparison.push(vsAvgEng >= 0
        ? `Su engagement supera en ${vsAvgEng} puntos a la media de tu cuenta (${distribution.avgEngagementRate}%).`
        : `Su engagement está ${Math.abs(vsAvgEng)} puntos por debajo de la media de tu cuenta (${distribution.avgEngagementRate}%).`)
    }
  } else {
    comparison.push('Aún no hay suficiente histórico para una comparación relativa fiable (registra más posts).')
  }

  const confidence = items.length >= 8 ? 0.75 : items.length >= 4 ? 0.55 : 0.35
  const hypotheses = []
  const highRet = rec.metrics.retention != null && pnum(rec.metrics.retention) >= 50
  if (highRet && (rec.classification === 'HIGH' || rec.classification === 'OUTLIER')) hypotheses.push('Una retención de vídeo alta APARECE ASOCIADA a este alto rendimiento (asociación, no causalidad).')
  if (d.videoViewRate != null && d.videoViewRate >= 100 && rec.performanceScore >= 60) hypotheses.push('Un ratio de reproducciones muy alto respecto a impresiones ESTÁ ASOCIADO con mejor rendimiento en esta muestra.')
  if (d.bookmarkRate != null && d.bookmarkRate >= 1) hypotheses.push('Una tasa de guardados elevada ESTÁ ASOCIADA con contenido de referencia/guardable.')
  if (!hypotheses.length) hypotheses.push('No hay suficientes señales diferenciales para extraer una hipótesis con confianza; registra más posts.')

  return {
    classification: rec.classification,
    percentile,
    vsAverageEngagement: vsAvgEng,
    observations,
    comparison,
    hypotheses,
    confidence,
    disclaimer: 'Los patrones indican ASOCIACIÓN con el rendimiento, no causalidad. El score es un indicador interno, no una predicción de impresiones futuras.',
  }
}
