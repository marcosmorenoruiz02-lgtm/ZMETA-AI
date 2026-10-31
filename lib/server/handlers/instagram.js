import { v4 as uuidv4 } from 'uuid'
import { bumpMetrics, getDb } from '@/lib/server/db'
import { generateJSON, SYSTEM, transcribeBuffer } from '@/lib/server/gemini'
import { fail, json } from '@/lib/server/http'
import { fetchInstagramMedia, igExtract, isInstagramUrl } from '@/lib/server/instagram'
import { buildVisionPrompt, NO_EVIDENCE } from '@/lib/server/prompts'
import { isInstagramCdnUrl } from '@/lib/server/urls'

function bounded(value, max, label) {
  const text = String(value ?? '').trim()
  if (text.length > max) throw fail(`${label} es demasiado largo (máx. ${max} caracteres).`, 400)
  return text
}

export async function downloadInstagram(body) {
  const url = bounded(body?.url, 500, 'La URL')
  if (!isInstagramUrl(url)) throw fail('URL de Instagram no válida. Usa un enlace de reel/p/tv.', 400)
  const data = await igExtract(url)
  if (!data.mp4Url) throw fail('No se encontró vídeo MP4 en ese enlace (¿es una foto o cuenta privada?).', 422)
  return json({ ok: true, url, ...data })
}

export async function proxyInstagram(request) {
  const target = new URL(request.url).searchParams.get('url') || ''
  if (!target) throw fail('url requerido', 400)
  if (!isInstagramCdnUrl(target)) throw fail('Solo se pueden descargar archivos del CDN de Instagram.', 400)
  const upstream = await fetchInstagramMedia(target)
  const headers = new Headers()
  headers.set('Content-Type', upstream.headers.get('content-type') || 'video/mp4')
  headers.set('Content-Disposition', 'attachment; filename="zmeta-reel.mp4"')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Cache-Control', 'private, no-store')
  return new Response(upstream.body, { status: 200, headers })
}

export async function analyzeInstagram(body) {
  const url = bounded(body?.url, 500, 'La URL')
  const note = bounded(body?.note, 2000, 'La nota')
  if (!isInstagramUrl(url)) throw fail('URL de Instagram no válida.', 400)
  const meta = await igExtract(url)
  if (!meta.mp4Url) throw fail('No se encontró vídeo MP4 en ese enlace.', 422)

  let transcript = ''
  let transcriptError = null
  try {
    const vr = await fetchInstagramMedia(meta.mp4Url)
    const buf = Buffer.from(await vr.arrayBuffer())
    if (buf.length <= 20 * 1024 * 1024) transcript = await transcribeBuffer(buf, 'video/mp4')
    else transcriptError = 'Vídeo >20MB: audio no transcrito'
  } catch (error) {
    transcriptError = error?.message || 'Transcripción no disponible'
  }

  let image = null
  try {
    if (meta.thumbnail) {
      const { fetchPublic } = await import('@/lib/server/urls')
      const tr = await fetchPublic(meta.thumbnail, { allow: isInstagramCdnUrl, timeoutMs: 12000 })
      if (tr.ok) {
        const tb = Buffer.from(await tr.arrayBuffer())
        if (tb.length > 0 && tb.length <= 4 * 1024 * 1024) {
          const mt = (tr.headers.get('content-type') || 'image/jpeg').split(';')[0]
          if (mt.startsWith('image/')) image = `data:${mt};base64,${tb.toString('base64')}`
        }
      }
    }
  } catch { image = null }

  const { mediaToPart } = await import('@/lib/server/gemini')
  const parts = [{ text: buildVisionPrompt(note || meta.caption, transcript, image ? 1 : 0) }]
  if (image) {
    const part = await mediaToPart(image, { optional: true })
    if (part) parts.push(part)
  }
  const result = await generateJSON({ system: SYSTEM, parts, temperature: 0.15 })
  const metrics = await bumpMetrics(await getDb(), 3, 1)
  const audio = result?.audio || { transcript: '', keyQuotes: [], tone: NO_EVIDENCE }
  if (transcript && !audio.transcript) audio.transcript = transcript
  if (transcriptError) audio.error = transcriptError
  const payload = {
    id: uuidv4(),
    mode: 'media',
    source: 'instagram',
    igUrl: url,
    mp4Url: meta.mp4Url,
    thumbnail: meta.thumbnail,
    caption: meta.caption,
    evidence: result?.evidence || null,
    vision: result?.vision || null,
    audio,
    combined_hook_angle: result?.combined_hook_angle || '',
    analysis: { patternAnalysis: result?.patternAnalysis || null, generatedTweets: result?.generatedTweets || [] },
    growth: result?.growth || null,
    metrics,
    createdAt: new Date(),
  }
  await (await getDb()).collection('analyses').insertOne({ ...payload })
  const { _id, ...clean } = payload
  return json(clean)
}
