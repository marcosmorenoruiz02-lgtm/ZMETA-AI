const HKEY = 'zmeta_history_v1'

export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HKEY) || '[]') } catch { return [] }
}

export function persistHistory(list) {
  try { localStorage.setItem(HKEY, JSON.stringify(list.slice(0, 40))) } catch { /* cuota llena */ }
}

export function sortHistory(list) {
  return [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt) - new Date(a.createdAt))
}

export function djb2(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i)
    h = h & 0xffffffff
  }
  return (h >>> 0).toString(16)
}
