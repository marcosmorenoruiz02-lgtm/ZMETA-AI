import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { computeBookmarkScore } from '@/lib/server/bookmark'
import { buildGenerationConfig, generateJSON, parseModelJson } from '@/lib/server/gemini'
import { isInstagramCdnUrl, isPublicHttpsUrl } from '@/lib/server/urls'
import { computeViralDNA, engagementScore } from '@/lib/server/tweets'
import { allowedOrigins, corsHeaders } from '@/lib/server/cors'

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, acc)
    else if (/\.(js|jsx|mjs)$/.test(name)) acc.push(full)
  }
  return acc
}

test('la generación no depende del proxy Emergent', () => {
  const files = [...walk('lib/server'), ...walk('app/api')]
  const hits = files.filter((file) => /emergent/i.test(readFileSync(file, 'utf8')))
  assert.deepEqual(hits, [])
})

test('parseModelJson acepta JSON con cercas y texto extra', () => {
  assert.deepEqual(parseModelJson('```json\n{"ok":1}\n```'), { ok: 1 })
  assert.deepEqual(parseModelJson('nota {"a":2} fin'), { a: 2 })
  assert.throws(() => parseModelJson('sin json'), /JSON/)
})

test('Gemini 3 no envía temperature y usa pensamiento bajo', () => {
  const cfg = buildGenerationConfig({ temperature: 0.9, model: 'gemini-3.8-flash' })
  assert.equal(cfg.responseMimeType, 'application/json')
  assert.equal(cfg.thinkingConfig.thinkingLevel, 'low')
  assert.equal(cfg.temperature, undefined)
  const legacy = buildGenerationConfig({ temperature: 0.4, model: 'gemini-2.5-flash' })
  assert.equal(legacy.temperature, 0.4)
  assert.equal(legacy.thinkingConfig, undefined)
})

test('generateJSON llama a la API oficial de Google', async () => {
  const prevKey = process.env.GEMINI_API_KEY
  const prevModel = process.env.GEMINI_MODEL
  process.env.GEMINI_API_KEY = 'clave-de-prueba'
  process.env.GEMINI_MODEL = 'gemini-3.8-flash'
  const original = global.fetch
  global.fetch = async (url, opts) => {
    assert.match(String(url), /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.8-flash:generateContent/)
    assert.equal(opts.headers['x-goog-api-key'], 'clave-de-prueba')
    const body = JSON.parse(opts.body)
    assert.equal(body.generationConfig.temperature, undefined)
    assert.equal(body.systemInstruction.parts[0].text.includes('JSON'), true)
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ thought: true, text: 'pensando' }, { text: '{"text":"hola"}' }] } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  try {
    const out = await generateJSON({ system: 'Responde JSON', prompt: 'escribe' })
    assert.equal(out.text, 'hola')
  } finally {
    global.fetch = original
    if (prevKey === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = prevKey
    if (prevModel === undefined) delete process.env.GEMINI_MODEL
    else process.env.GEMINI_MODEL = prevModel
  }
})

test('sin GEMINI_API_KEY no se llama a la red', async () => {
  const prev = process.env.GEMINI_API_KEY
  delete process.env.GEMINI_API_KEY
  const original = global.fetch
  global.fetch = async () => { throw new Error('no debería llamarse') }
  try {
    await assert.rejects(() => generateJSON({ prompt: 'hola' }), /GEMINI_API_KEY/)
  } finally {
    global.fetch = original
    if (prev === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = prev
  }
})

test('bookmark score: lista, CTA, enlace y nicho libre', async () => {
  const rich = computeBookmarkScore('3 formas de usar IA hoy:\n1. Prompt\n2. API\n3. Dataset\n¿Cuál usarías?', 'tech_ai', false, '')
  assert.equal(typeof rich.score, 'number')
  assert.ok(rich.score >= 0 && rich.score <= 100)
  assert.equal(rich.cta.present, true)
  assert.equal(rich.breakdown.actionability >= 0, true)

  const linked = computeBookmarkScore('Mira esto https://ejemplo.com/guia ahora mismo en detalle de producto', 'tech_ai', false, '')
  assert.equal(linked.linkIsolation.hasExternalLink, true)
  assert.equal(linked.linkIsolation.recommendMoveToReply, true)
  const moved = computeBookmarkScore('Mira esto https://ejemplo.com/guia ahora mismo en detalle de producto', 'tech_ai', false, 'https://ejemplo.com/guia')
  assert.equal(moved.linkIsolation.recommendMoveToReply, false)

  const custom = computeBookmarkScore('3 claves para novios:\n1. Luz lateral\n2. Manos relajadas\n3. Mirada fuera', 'Fotografía de bodas', false, '')
  assert.equal(custom.cluster, 'Fotografía de bodas')
  assert.match(custom.cta.suggestion, /Fotografía de bodas/)

  const empty = computeBookmarkScore('', 'tech_ai', false, '')
  assert.equal(typeof empty.score, 'number')
  assert.ok(empty.score <= 35)
})

test('el engagement ordena por la fórmula compuesta', () => {
  const low = { views: 10, likes: 1, retweets: 0, replies: 0, quotes: 0 }
  const high = { views: 100, likes: 10, retweets: 4, replies: 2, quotes: 1 }
  assert.ok(engagementScore(high) > engagementScore(low))
  assert.equal(engagementScore({ views: 20, likes: 0, retweets: 0, replies: 0, quotes: 0 }), 1)
})

test('viral DNA pide una muestra mínima', () => {
  const dna = computeViralDNA([{ text: 'uno' }, { text: 'dos' }])
  assert.equal(dna.available, false)
})

test('las URLs internas y ajenas al CDN se rechazan', () => {
  assert.equal(isPublicHttpsUrl('https://pbs.twimg.com/media/a.jpg'), true)
  assert.equal(isPublicHttpsUrl('http://pbs.twimg.com/a.jpg'), false)
  assert.equal(isPublicHttpsUrl('https://127.0.0.1/secret'), false)
  assert.equal(isPublicHttpsUrl('https://169.254.169.254/latest'), false)
  assert.equal(isPublicHttpsUrl('https://localhost/x'), false)
  assert.equal(isPublicHttpsUrl('https://10.0.0.5/x'), false)
  assert.equal(isInstagramCdnUrl('https://scontent.cdninstagram.com/v/video.mp4'), true)
  assert.equal(isInstagramCdnUrl('https://instagram.fiev22-1.fna.fbcdn.net/v/x.mp4'), true)
  assert.equal(isInstagramCdnUrl('https://httpbin.org/image/png'), false)
  assert.equal(isInstagramCdnUrl('https://evil.com/cdninstagram.com'), false)
})

test('CORS no abre el origen con credenciales por defecto', () => {
  const prev = process.env.CORS_ORIGINS
  delete process.env.CORS_ORIGINS
  const headers = corsHeaders({ headers: { get: () => 'https://evil.example' } })
  assert.equal(headers['Access-Control-Allow-Origin'], undefined)
  assert.equal(headers['Access-Control-Allow-Credentials'], undefined)
  process.env.CORS_ORIGINS = 'https://app.example'
  const allowed = corsHeaders({ headers: { get: () => 'https://app.example' } })
  assert.equal(allowed['Access-Control-Allow-Origin'], 'https://app.example')
  assert.equal(allowed['Access-Control-Allow-Credentials'], 'true')
  process.env.CORS_ORIGINS = '*'
  const star = corsHeaders({ headers: { get: () => 'https://otro.example' } })
  assert.equal(star['Access-Control-Allow-Origin'], '*')
  assert.equal(star['Access-Control-Allow-Credentials'], undefined)
  assert.deepEqual(allowedOrigins(), ['*'])
  if (prev === undefined) delete process.env.CORS_ORIGINS
  else process.env.CORS_ORIGINS = prev
})
