import { v4 as uuidv4 } from 'uuid'
import { avg, clamp } from '@/lib/server/number'

export function extractTweetMedia(t) {
  const out = []
  const cands = t?.extendedEntities?.media || t?.entities?.media || t?.media || t?.extended_entities?.media || []
  for (const m of cands || []) {
    const type = m?.type || (m?.video_info ? 'video' : 'photo')
    const url = m?.media_url_https || m?.media_url || m?.thumbnail_url || m?.preview_image_url || m?.url
    let videoUrl = null
    const variants = m?.video_info?.variants || m?.videoInfo?.variants || []
    if (variants.length) {
      const mp4s = variants.filter((v) => (v?.content_type || v?.contentType) === 'video/mp4' && v?.url)
      mp4s.sort((a, b) => (b?.bitrate || 0) - (a?.bitrate || 0))
      videoUrl = mp4s[0]?.url || null
    }
    const info = m?.original_info || m?.sizes?.large || {}
    if (url || videoUrl) {
      out.push({
        type,
        url: url || null,
        videoUrl,
        thumbnail: m?.media_url_https || m?.preview_image_url || m?.thumbnail_url || url || null,
        durationMs: m?.video_info?.duration_millis || m?.videoInfo?.duration_millis || null,
        width: info?.width || m?.width || null,
        height: info?.height || m?.height || null,
        altText: m?.ext_alt_text || m?.altText || m?.alt_text || '',
      })
    }
  }
  for (const u of t?.mediaUrls || t?.photoUrls || []) {
    if (typeof u === 'string') out.push({ type: 'photo', url: u, thumbnail: u })
  }
  return out
}

export function normalizeTweet(t, fallbackAuthor = null) {
  const author = t?.author || fallbackAuthor || {}
  const media = extractTweetMedia(t)
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
    media,
    hasMedia: media.length > 0,
    author: {
      name: author?.name || '',
      userName: author?.userName || '',
      profilePicture: author?.profilePicture || '',
    },
  }
}

export function engagementScore(t) {
  return (t.views || 0) * 0.05 + (t.likes || 0) + (t.retweets || 0) * 2 + (t.replies || 0) * 1.5 + (t.quotes || 0) * 3
}

export function computePrimeTimes(tweets) {
  const buckets = {}
  for (const t of tweets) {
    const d = t?.createdAt ? new Date(t.createdAt) : null
    if (!d || Number.isNaN(d.getTime())) continue
    const start = Math.floor(d.getUTCHours() / 2) * 2
    if (!buckets[start]) buckets[start] = { window: `${String(start).padStart(2, '0')}:00–${String(start + 2).padStart(2, '0')}:00 UTC`, count: 0, score: 0 }
    buckets[start].count += 1
    buckets[start].score += engagementScore(t)
  }
  return Object.values(buckets)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((b) => ({ ...b, score: Math.round(b.score) }))
}

export function tweetFeatures(t) {
  const text = t.text || ''
  const first = text.split('\n')[0] || ''
  return {
    hasVideo: (t.media || []).some((m) => m.type === 'video' || m.videoUrl),
    hasImage: (t.media || []).some((m) => m.type === 'photo' || (m.type && m.type.includes('photo'))),
    hasMedia: (t.media || []).length > 0,
    isList: /(^|\n)\s*(\d+[\.\)]|[-•*→✅])/m.test(text),
    startsQuestion: /^[¿?]/.test(first.trim()) || first.includes('?'),
    shortHook: first.trim().length <= 60,
    hasNumber: /\d/.test(first),
    hasEmoji: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text),
    lenBand: text.length <= 120 ? 'corto' : text.length <= 240 ? 'medio' : 'largo',
  }
}

const DNA_LABELS = {
  hasVideo: 'Uso de vídeo',
  hasImage: 'Uso de imagen',
  isList: 'Formato lista/pasos',
  startsQuestion: 'Apertura con pregunta',
  shortHook: 'Gancho corto (1ª línea)',
  hasNumber: 'Cifra en el gancho',
  hasEmoji: 'Uso de emojis',
}

export function computeViralDNA(tweets) {
  const valid = (tweets || []).filter((t) => t.text)
  if (valid.length < 4) return { available: false, reason: 'Muestra insuficiente para extraer patrones fiables (mín. 4).', patterns: [], sampleSize: valid.length }
  const scored = valid.map((t) => ({ t, s: engagementScore(t), f: tweetFeatures(t) }))
  scored.sort((a, b) => b.s - a.s)
  const cut = Math.max(1, Math.round(scored.length / 3))
  const high = scored.slice(0, cut)
  const rest = scored.slice(cut)
  const rate = (arr, key) => (arr.length ? arr.filter((x) => x.f[key]).length / arr.length : 0)
  const patterns = []
  for (const key of Object.keys(DNA_LABELS)) {
    const hi = rate(high, key)
    const lo = rate(rest, key)
    const lift = +(hi - lo).toFixed(2)
    const evidenceCount = high.filter((x) => x.f[key]).length
    if (hi >= 0.4 && lift >= 0.15) {
      const avgPerf = Math.round(avg(high.filter((x) => x.f[key]).map((x) => x.s)))
      const confidence = +Math.min(0.85, 0.3 + lift + Math.min(0.2, evidenceCount * 0.05)).toFixed(2)
      patterns.push({
        patternType: key,
        description: `${DNA_LABELS[key]} APARECE ASOCIADO con tus posts de mayor rendimiento (${Math.round(hi * 100)}% de los top vs ${Math.round(lo * 100)}% del resto).`,
        presenceInTop: Math.round(hi * 100),
        presenceInRest: Math.round(lo * 100),
        lift,
        evidenceCount,
        averagePerformance: avgPerf,
        confidence,
      })
    }
  }
  patterns.sort((a, b) => b.lift - a.lift)
  const bandCounts = {}
  high.forEach((x) => { bandCounts[x.f.lenBand] = (bandCounts[x.f.lenBand] || 0) + 1 })
  const dominantBand = Object.entries(bandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'medio'
  return {
    available: true,
    sampleSize: valid.length,
    topSize: high.length,
    dominantLength: dominantBand,
    patterns,
    disclaimer: 'Los patrones indican ASOCIACIÓN estadística con el rendimiento en TU cuenta, no causalidad.',
  }
}

export function computeViralPotential(tweetText, viralDNA) {
  const t = tweetFeatures({ text: tweetText || '', media: [] })
  let score = 45
  const used = []
  if (viralDNA?.available && viralDNA.patterns?.length) {
    for (const p of viralDNA.patterns) {
      if (t[p.patternType]) {
        score += Math.round(p.lift * 40) + 5
        used.push(DNA_LABELS[p.patternType])
      }
    }
  } else {
    if (t.isList) score += 10
    if (t.shortHook) score += 8
    if (t.startsQuestion) score += 6
    if (t.hasNumber) score += 6
  }
  const first = (tweetText || '').split('\n')[0] || ''
  if (first.trim().length > 0 && first.trim().length <= 70) score += 5
  if ((tweetText || '').length > 280) score -= 6
  return { viralPotentialScore: clamp(score), patternUsed: used }
}

export function enrichGeneratedTweets(analysis, personality, viralDNA) {
  if (!analysis?.generatedTweets) return analysis
  analysis.generatedTweets = analysis.generatedTweets.map((t) => {
    let vs = t.voiceScore
    if (typeof vs === 'string') vs = parseInt(vs, 10)
    if (!personality) vs = null
    else if (typeof vs !== 'number' || Number.isNaN(vs)) vs = null
    else vs = Math.max(0, Math.min(100, Math.round(vs)))
    const full = (t.thread && t.thread.length ? t.thread.join('\n') : t.text) || ''
    const vp = computeViralPotential(full, viralDNA)
    const approach = vp.patternUsed.length
      ? `Aplica patrones asociados a tu alto rendimiento: ${vp.patternUsed.join(', ')}.`
      : 'Enfoque general de gancho + valor (sin ADN viral suficiente todavía).'
    return { ...t, voiceScore: vs, viralPotentialScore: vp.viralPotentialScore, patternUsed: vp.patternUsed, approach }
  })
  return analysis
}
