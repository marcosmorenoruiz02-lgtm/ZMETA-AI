export function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function pnum(v) {
  const n = Number(v)
  return Number.isNaN(n) ? 0 : Math.max(0, n)
}

export function pct(a, b) {
  return b > 0 ? +((a / b) * 100).toFixed(2) : null
}

export function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

export function stddev(arr) {
  if (arr.length < 2) return 0
  const m = avg(arr)
  return Math.sqrt(avg(arr.map((x) => (x - m) ** 2)))
}
