import { fetchPublic, isInstagramCdnUrl } from '@/lib/server/urls'

export function isInstagramUrl(u) {
  return /^https?:\/\/(www\.)?instagram\.com\/(reel|reels|p|tv)\/[\w-]+/i.test(u || '')
}

export async function igExtract(url) {
  const host = process.env.RAPIDAPI_HOST_INSTAGRAM
  const key = process.env.RAPIDAPI_KEY
  if (!host || !key) {
    const err = new Error('Faltan RAPIDAPI_KEY o RAPIDAPI_HOST_INSTAGRAM en el entorno.')
    err.status = 500
    throw err
  }
  if (!/^[\w.-]+$/.test(host)) {
    const err = new Error('RAPIDAPI_HOST_INSTAGRAM no es válido.')
    err.status = 500
    throw err
  }
  const api = `https://${host}/unified/url?url=${encodeURIComponent(url)}`
  let r
  try {
    r = await fetch(api, {
      headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host },
      cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    })
  } catch {
    const err = new Error('No se pudo contactar con el servicio de Instagram.')
    err.status = 502
    throw err
  }
  let json = {}
  try { json = await r.json() } catch { json = {} }
  if (!r.ok || !json?.success) {
    const msg = json?.error?.message || `No se pudo extraer el contenido de Instagram (${r.status})`
    const err = new Error(String(msg).slice(0, 240))
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
  if (mp4Url && !isInstagramCdnUrl(mp4Url)) mp4Url = null
  if (thumbnail && !isInstagramCdnUrl(thumbnail)) thumbnail = null
  return { mp4Url, thumbnail, caption: json?.data?.title || '', mediaType: json?.media_type || 'video' }
}

export async function fetchInstagramMedia(url) {
  const res = await fetchPublic(url, { allow: isInstagramCdnUrl, timeoutMs: 25000 })
  if (!res.ok) {
    const err = new Error('No se pudo descargar el vídeo')
    err.status = 502
    throw err
  }
  return res
}
