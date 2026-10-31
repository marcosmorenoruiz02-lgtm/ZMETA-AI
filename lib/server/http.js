import { NextResponse } from 'next/server'
import { allowedOrigins, corsHeaders } from './cors.js'

const MAX_BODY = 32 * 1024 * 1024

export { allowedOrigins, corsHeaders }

export function withCors(response, request) {
  const headers = corsHeaders(request)
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
  return response
}

export function preflight(request) {
  return withCors(new NextResponse(null, { status: 204 }), request)
}

export function json(data, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(message, status = 400) {
  const err = new Error(message)
  err.status = status
  return err
}

export async function readJson(request) {
  if (request.method === 'GET' || request.method === 'DELETE' || request.method === 'OPTIONS') return {}
  const text = await request.text()
  if (!text.trim()) return {}
  if (text.length > MAX_BODY) throw fail('El archivo es demasiado grande.', 413)
  try {
    const body = JSON.parse(text)
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail('El cuerpo de la petición no es un objeto JSON.', 400)
    return body
  } catch (error) {
    if (error?.status) throw error
    throw fail('El cuerpo de la petición no es JSON válido.', 400)
  }
}

export function publicMessage(error) {
  const msg = String(error?.message || 'Error interno')
  const key = process.env.GEMINI_API_KEY
  let clean = msg
  if (key && key.length > 6) clean = clean.split(key).join('[redactado]')
  clean = clean.replace(/mongodb(\+srv)?:\/\/\S+/gi, 'mongodb://[redactado]')
  if (/bearer\s+\S+/i.test(clean)) clean = 'Error interno al contactar un servicio externo.'
  return clean.slice(0, 300)
}
