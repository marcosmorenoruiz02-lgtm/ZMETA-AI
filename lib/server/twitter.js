import { normalizeTweet } from '@/lib/server/tweets'

const TWITTER_BASE = 'https://api.twitterapi.io'

async function twitterFetch(path, params) {
  const key = process.env.TWITTER_API_IO_KEY
  if (!key) {
    const err = new Error('Falta TWITTER_API_IO_KEY en el entorno.')
    err.status = 500
    throw err
  }
  const url = new URL(TWITTER_BASE + path)
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  })
  let lastError
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { 'X-API-Key': key },
        signal: AbortSignal.timeout(20000),
        cache: 'no-store',
      })
      if ((res.status === 429 || res.status >= 500) && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        continue
      }
      if (!res.ok) {
        const txt = await res.text()
        const err = new Error(`Twitter API error (${res.status}): ${txt.replace(/\s+/g, ' ').slice(0, 180)}`)
        err.status = res.status === 401 || res.status === 403 ? 502 : res.status === 402 ? 402 : 502
        throw err
      }
      return res.json()
    } catch (error) {
      lastError = error
      if (error?.status) throw error
      if (attempt === 1) break
    }
  }
  const err = new Error(lastError?.name === 'TimeoutError' ? 'Twitter API tardó demasiado. Inténtalo de nuevo.' : 'No se pudo contactar con Twitter API.')
  err.status = 502
  throw err
}

export function twitterGet(path, params) {
  return twitterFetch(path, params)
}

export async function getUserData(userName) {
  const clean = userName.replace(/^@+/, '').trim()
  if (!/^[\w.]{1,30}$/.test(clean)) {
    const err = new Error('El @usuario no es válido.')
    err.status = 400
    throw err
  }
  const [infoRes, topRes, latestRes] = await Promise.all([
    twitterGet('/twitter/user/info', { userName: clean }),
    twitterGet('/twitter/tweet/advanced_search', { query: `from:${clean}`, queryType: 'Top' }).catch(() => ({ tweets: [] })),
    twitterGet('/twitter/tweet/advanced_search', { query: `from:${clean}`, queryType: 'Latest' }).catch(() => ({ tweets: [] })),
  ])
  const info = infoRes?.data || {}
  const authorFallback = { name: info?.name, userName: info?.userName, profilePicture: info?.profilePicture }
  const top = (topRes?.tweets || []).filter((t) => t?.text && !t?.isReply)
  const latest = (latestRes?.tweets || []).filter((t) => t?.text && !t?.isReply)
  const seen = new Set()
  let raw = []
  for (const t of [...top, ...latest]) {
    const id = t?.id || t?.url
    if (id && !seen.has(id)) {
      seen.add(id)
      raw.push(t)
    }
  }
  if (raw.length === 0) {
    const tweetsRes = await twitterGet('/twitter/user/last_tweets', { userName: clean }).catch(() => ({}))
    raw = (tweetsRes?.data?.tweets || []).filter((t) => t?.text && !t?.isReply)
  }
  return { info, tweets: raw.map((t) => normalizeTweet(t, authorFallback)) }
}

function usableTweets(res, minFaves) {
  return (res?.tweets || [])
    .filter((t) => t?.text && !t?.isReply)
    .map((t) => normalizeTweet(t))
    .filter((t) => (t.likes || 0) >= minFaves)
}

export async function getTopicData(query, minFaves) {
  const base = String(query).replace(/\s+/g, ' ').trim()
  let tweets = []
  try {
    tweets = usableTweets(await twitterGet('/twitter/tweet/advanced_search', { query: `${base} min_faves:${minFaves}`, queryType: 'Latest' }), minFaves)
  } catch {
    tweets = []
  }
  if (!tweets.length) {
    tweets = usableTweets(await twitterGet('/twitter/tweet/advanced_search', { query: base, queryType: 'Latest' }), minFaves)
  }
  return tweets
}
