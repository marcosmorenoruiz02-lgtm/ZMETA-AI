import { isIP } from 'node:net'

function isPrivateV4(ip) {
  const [a, b] = ip.split('.').map(Number)
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

function isPrivateV6(ip) {
  const n = ip.toLowerCase()
  return n === '::1' || n === '::' || n.startsWith('fc') || n.startsWith('fd') || n.startsWith('fe80')
}

export function isPublicHttpsUrl(raw) {
  let url
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  if (url.username || url.password) return false
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false
  const kind = isIP(host)
  if (kind === 4 && isPrivateV4(host)) return false
  if (kind === 6 && isPrivateV6(host)) return false
  return true
}

export function isInstagramCdnUrl(raw) {
  if (!isPublicHttpsUrl(raw)) return false
  const host = new URL(raw).hostname.toLowerCase()
  return host === 'cdninstagram.com' || host.endsWith('.cdninstagram.com') || host.endsWith('.fbcdn.net')
}

export async function fetchPublic(url, { allow, timeoutMs = 15000, redirects = 3 } = {}) {
  const accept = allow || isPublicHttpsUrl
  if (!accept(url)) {
    const err = new Error('URL no permitida.')
    err.status = 400
    throw err
  }
  let current = url
  for (let hop = 0; hop <= redirects; hop++) {
    const res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) {
        const err = new Error('Redirección sin destino.')
        err.status = 502
        throw err
      }
      current = new URL(loc, current).toString()
      if (!accept(current)) {
        const err = new Error('La redirección apunta a un host no permitido.')
        err.status = 400
        throw err
      }
      continue
    }
    return res
  }
  const err = new Error('Demasiadas redirecciones.')
  err.status = 502
  throw err
}
