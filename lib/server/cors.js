export function allowedOrigins() {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function corsHeaders(request) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  }
  const allow = allowedOrigins()
  if (!allow.length || !request) return headers
  const origin = request.headers.get('origin')
  if (!origin) return headers
  if (allow.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*'
    return headers
  }
  if (allow.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  return headers
}
