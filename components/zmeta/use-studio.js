'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { djb2, loadHistory, persistHistory, sortHistory } from '@/lib/client/history'
import { NICHES, TEXT_FORMATS } from '@/lib/client/copy'

export function useStudio() {
  const [section, setSection] = useState('analizar')
  const [mode, setMode] = useState('topic')
  const [userQuery, setUserQuery] = useState('')
  const [topicQuery, setTopicQuery] = useState('')
  const [minFaves, setMinFaves] = useState(100)
  const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('')
  const [data, setData] = useState(null)
  const [tweets, setTweets] = useState([])
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState({ hours_saved: 0, posts: 0, diagnostics: 0 })
  const [myHandle, setMyHandle] = useState('')
  const [rewriting, setRewriting] = useState(null)
  const [scheduling, setScheduling] = useState(null)
  const [scheduledCount, setScheduledCount] = useState(0)
  const [resultMedia, setResultMedia] = useState(null)
  const [expressTopic, setExpressTopic] = useState('')
  const [igUrl, setIgUrl] = useState('')
  const [igLoading, setIgLoading] = useState(false)
  const [igResult, setIgResult] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const [history, setHistory] = useState([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [composeText, setComposeText] = useState('')
  const [cluster, setCluster] = useState('Tech & IA')
  const [composeReply, setComposeReply] = useState('')
  const [bmScore, setBmScore] = useState(null)
  const [bmLoading, setBmLoading] = useState(false)
  const [bmFixing, setBmFixing] = useState(null)
  const [composeScheduling, setComposeScheduling] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduledItems, setScheduledItems] = useState([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [tip, setTip] = useState(null)
  const resultsRef = useRef(null)
  const alertShownRef = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem('zmeta_handle')
    if (saved) setMyHandle(saved)
    setHistory(sortHistory(loadHistory()))
    fetchMetrics()
    fetchScheduled()
  }, [])

  const fetchMetrics = async () => {
    try {
      const r = await fetch('/api/metrics')
      const j = await r.json()
      if (r.ok) setMetrics(j)
    } catch { /* sin base de datos en local */ }
  }
  const fetchScheduled = async () => {
    try {
      const r = await fetch('/api/schedule')
      const j = await r.json()
      if (r.ok) setScheduledCount(j.count || 0)
    } catch { /* igual */ }
  }

  useEffect(() => {
    const t = setTimeout(async () => {
      if (alertShownRef.current) return
      alertShownRef.current = true
      try {
        const topic = mode === 'topic' && topicQuery ? topicQuery : 'tu nicho'
        const res = await fetch(`/api/alerts?topic=${encodeURIComponent(topic)}`)
        const j = await res.json()
        const a = j?.alerts?.[0]
        if (a) setTip(a)
      } catch { /* alerta opcional */ }
    }, 2500)
    return () => clearTimeout(t)
  }, [mode, topicQuery])

  const saveHandle = (v) => {
    setMyHandle(v)
    localStorage.setItem('zmeta_handle', v)
  }

  const showResults = () => {
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const applyResult = (json, media = null, cached = false) => {
    setData(json)
    setTweets(json?.analysis?.generatedTweets || [])
    setResultMedia(media)
    setFromCache(cached)
    if (json?.metrics) setMetrics(json.metrics)
    if (cached) toast.message('Recuperado de tu historial')
    else toast.success('Listo: 3 propuestas para publicar')
    showResults()
  }

  const saveRun = (entry) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.hash !== entry.hash)
      const next = sortHistory([entry, ...filtered])
      persistHistory(next)
      return next
    })
  }

  const runGeneric = async ({ apiPath, apiBody, label, media = null, focus }) => {
    const hash = djb2('v1|' + JSON.stringify(apiBody))
    const hit = history.find((h) => h.hash === hash)
    if (hit) {
      applyResult(hit.result, media, true)
      return
    }
    setLoading(true)
    setLoadingLabel(focus)
    setError('')
    setData(null)
    setTweets([])
    setResultMedia(null)
    setFromCache(false)
    showResults()
    try {
      const res = await fetch(apiPath, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(apiBody) })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'No se pudo completar. Inténtalo de nuevo.')
        toast.error(json?.error || 'No se pudo completar')
      } else {
        applyResult(json, media, false)
        saveRun({
          hash,
          label,
          mode: apiBody.type || apiBody.format || 'media',
          query: apiBody.query || apiBody.topic || 'media',
          createdAt: new Date().toISOString(),
          pinned: false,
          result: json,
        })
      }
    } catch {
      setError('No hay conexión con el servidor.')
      toast.error('No hay conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const runAnalysis = () => {
    const query = mode === 'user' ? userQuery.trim() : topicQuery.trim()
    if (!query) {
      toast.error(mode === 'user' ? 'Escribe un @usuario' : 'Escribe o elige un tema')
      return
    }
    runGeneric({
      apiPath: '/api/analyze-and-generate',
      apiBody: { type: mode, query, minFaves },
      label: `${mode === 'user' ? '@' : '#'} ${query}`,
      focus: mode === 'user' ? `Mirando qué publica ${query}` : `Buscando ideas sobre “${query}”`,
    })
  }

  const runVision = ({ image, frames, media, mediaType, preview, note }) => {
    runGeneric({
      apiPath: '/api/vision-generate',
      apiBody: { image, frames, media, mediaType, note },
      label: mediaType === 'image' ? 'Desde una imagen' : 'Desde un vídeo',
      media: preview,
      focus: 'Leyendo la imagen y el audio…',
    })
  }

  const runTemplate = (format) => {
    const topic = expressTopic.trim()
    if (!topic) {
      toast.error('Escribe de qué va el post')
      return
    }
    runGeneric({
      apiPath: '/api/text-template',
      apiBody: { format, topic },
      label: `${TEXT_FORMATS.find((f) => f.key === format)?.label || 'Post'}: ${topic}`,
      focus: `Escribiendo un ${TEXT_FORMATS.find((f) => f.key === format)?.label?.toLowerCase() || 'post'} sobre “${topic}”`,
    })
  }

  const extractInstagram = async () => {
    const u = igUrl.trim()
    if (!u) {
      toast.error('Pega el enlace de un Reel')
      return
    }
    setIgLoading(true)
    setIgResult(null)
    try {
      const res = await fetch('/api/instagram/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u }) })
      const j = await res.json()
      if (!res.ok) toast.error(j?.error || 'No se pudo leer ese Reel')
      else {
        setIgResult(j)
        toast.success('Vídeo listo')
      }
    } catch {
      toast.error('No hay conexión con el servidor')
    } finally {
      setIgLoading(false)
    }
  }

  const sendInstagramToViral = () => {
    if (!igResult?.url) return
    runGeneric({
      apiPath: '/api/instagram/analyze',
      apiBody: { url: igResult.url },
      label: `Reel: ${(igResult.caption || igResult.url).slice(0, 32)}`,
      media: { url: igResult.mp4Url, type: 'video', poster: igResult.thumbnail },
      focus: 'Transcribiendo el Reel y escribiendo tweets…',
    })
  }

  const rewriteTweet = async (index) => {
    const t = tweets[index]
    if (!t) return
    setRewriting(index)
    setLoadingLabel('Reescribiendo este tweet…')
    try {
      const res = await fetch('/api/rewrite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t.text, weakPoint: t.weakPoint, style: t.style }) })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error || 'No se pudo reescribir')
        return
      }
      const updated = [...tweets]
      updated[index] = { ...t, text: json.text, rationale: json.rationale, hookStrength: json.hookStrength, retention: json.retention, weakPoint: json.weakPoint, rewritten: true, thread: json.thread || t.thread || [] }
      setTweets(updated)
      if (json?.metrics) setMetrics(json.metrics)
      toast.success('Tweet reescrito')
    } catch {
      toast.error('No se pudo reescribir')
    } finally {
      setRewriting(null)
    }
  }

  const scheduleDraft = async (index) => {
    const t = tweets[index]
    if (!t) return
    setScheduling(index)
    try {
      const text = Array.isArray(t.thread) && t.thread.length > 1 ? t.thread.join('\n\n') : t.text
      const res = await fetch('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, style: t.style, hasMedia: !!resultMedia }) })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error || 'No se pudo guardar')
        return
      }
      setScheduledCount(json.count || 0)
      toast.success('Guardado en tu cola')
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setScheduling(null)
    }
  }

  useEffect(() => {
    if (section !== 'escribir') return
    if (!composeText.trim()) {
      setBmScore(null)
      setBmLoading(false)
      return
    }
    setBmLoading(true)
    const id = setTimeout(async () => {
      try {
        const res = await fetch('/api/bookmark-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: composeText, cluster, hasThread: composeText.length > 280, firstReply: composeReply }),
        })
        const j = await res.json()
        if (res.ok) setBmScore(j)
      } catch { /* el medidor es opcional */ } finally { setBmLoading(false) }
    }, 450)
    return () => clearTimeout(id)
  }, [composeText, cluster, composeReply, section])

  const composeUrls = composeText.match(/https?:\/\/[^\s]+/gi) || []
  const moveLinkToReply = () => {
    const url = composeUrls[0]
    if (!url) return
    setComposeText((prev) => prev.replace(url, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim())
    setComposeReply((prev) => (prev ? prev + '\n' : '') + url)
    toast.success('Enlace movido a la primera respuesta')
  }

  const fixMissing = async (target) => {
    if (!composeText.trim() || bmFixing) return
    setBmFixing(target)
    try {
      const res = await fetch('/api/bookmark-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: composeText, cluster, firstReply: composeReply, target }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error || 'No se pudo mejorar')
        return
      }
      if (json?.text) {
        setComposeText(json.text)
        toast.success('Post mejorado')
      }
    } catch {
      toast.error('No se pudo mejorar el texto')
    } finally {
      setBmFixing(null)
    }
  }

  const scheduleCompose = async () => {
    if (!composeText.trim()) {
      toast.error('Escribe el post primero')
      return
    }
    setComposeScheduling(true)
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: composeText, style: NICHES.find((c) => c.label === cluster)?.label || cluster }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error || 'No se pudo guardar')
        return
      }
      setScheduledCount(json.count || 0)
      toast.success('Guardado en tu cola')
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setComposeScheduling(false)
    }
  }

  const loadSchedule = async () => {
    setLoadingSchedule(true)
    try {
      const res = await fetch('/api/schedule')
      const json = await res.json()
      if (res.ok) {
        setScheduledItems(json.items || [])
        setScheduledCount(json.count || 0)
      }
    } catch { /* vacío */ } finally { setLoadingSchedule(false) }
  }

  const openSchedule = (open) => {
    setScheduleOpen(open)
    if (open) loadSchedule()
  }

  const deleteScheduled = async (id) => {
    try {
      const res = await fetch(`/api/schedule?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok) {
        setScheduledItems((prev) => prev.filter((x) => x.id !== id))
        setScheduledCount(json.count || 0)
        toast.success('Eliminado de la cola')
      } else toast.error('No se pudo eliminar')
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  const reloadRun = (item) => {
    setHistoryOpen(false)
    applyResult(item.result, null, true)
  }
  const togglePin = (hash) => {
    setHistory((prev) => {
      const next = sortHistory(prev.map((h) => h.hash === hash ? { ...h, pinned: !h.pinned } : h))
      persistHistory(next)
      return next
    })
  }
  const exportRun = (item) => {
    const blob = new Blob([JSON.stringify(item.result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zmeta-${item.query || 'run'}.json`.replace(/[^a-z0-9.\-]/gi, '_')
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    section, setSection, mode, setMode, userQuery, setUserQuery, topicQuery, setTopicQuery, minFaves, setMinFaves,
    loading, loadingLabel, data, tweets, error, metrics, myHandle, saveHandle, rewriting, scheduling, scheduledCount,
    resultMedia, expressTopic, setExpressTopic, igUrl, setIgUrl, igLoading, igResult, fromCache, history, historyOpen, setHistoryOpen,
    historySearch, setHistorySearch, composeText, setComposeText, cluster, setCluster, composeReply, setComposeReply,
    bmScore, bmLoading, bmFixing, composeScheduling, scheduleOpen, openSchedule, scheduledItems, loadingSchedule,
    tip, setTip, resultsRef, composeUrls, runAnalysis, runVision, runTemplate, extractInstagram, sendInstagramToViral,
    rewriteTweet, scheduleDraft, moveLinkToReply, fixMissing, scheduleCompose, deleteScheduled, reloadRun, togglePin, exportRun,
    filteredHistory: history.filter((h) => !historySearch || (h.label + h.query).toLowerCase().includes(historySearch.toLowerCase())),
  }
}
