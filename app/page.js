'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet'
import SocialPreview from '@/components/social-preview'
import MediaUploader from '@/components/media-uploader'
import {
  Sparkles, Search, User, Hash, Heart, Repeat2, MessageCircle, Eye, Copy, Check,
  Zap, TrendingUp, ExternalLink, Flame, BrainCircuit, BadgeCheck, Clock,
  AlertTriangle, Wand2, Loader2, Trophy, Radar, Sun, Moon, ImageIcon,
  ScanText, Smile, CalendarClock, Layers, Rocket, MessageSquareQuote, Lightbulb,
  History, Star, Download, RotateCcw, Activity, Cpu, Music, ListOrdered,
} from 'lucide-react'
import { toast } from 'sonner'

const SUGGESTED_TOPICS = ['Inteligencia Artificial', 'SaaS', 'Finanzas personales', 'Marketing digital', 'Productividad', 'Startups', 'Cripto']
const TEXT_FORMATS = [
  { key: 'thread', label: 'Thread Starter', desc: 'Inicio de hilo que engancha', icon: Layers },
  { key: 'controversy', label: 'Controversia', desc: 'Opinión polémica que genera debate', icon: MessageSquareQuote },
  { key: 'myth', label: 'Mito vs Realidad', desc: 'Desmonta una creencia común', icon: Lightbulb },
]
const STYLE_META = {
  'Educativo / Lista': { icon: BrainCircuit, color: 'text-sky-400', accent: 'ring-sky-500/40', chip: 'bg-sky-500/10 text-sky-400' },
  'Provocativo / Opinión': { icon: Flame, color: 'text-rose-400', accent: 'ring-rose-500/40', chip: 'bg-rose-500/10 text-rose-400' },
  'Directo / Gancho corto': { icon: Zap, color: 'text-amber-400', accent: 'ring-amber-500/40', chip: 'bg-amber-500/10 text-amber-500' },
}

const HKEY = 'zmeta_history_v1'
function loadHistory() { try { return JSON.parse(localStorage.getItem(HKEY) || '[]') } catch { return [] } }
function persistHistory(list) { try { localStorage.setItem(HKEY, JSON.stringify(list.slice(0, 40))) } catch (e) {} }
function djb2(str) { let h = 5381; for (let i = 0; i < str.length; i++) { h = ((h << 5) + h) + str.charCodeAt(i); h = h & 0xffffffff } return (h >>> 0).toString(16) }
function sortHistory(list) { return [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt) - new Date(a.createdAt)) }

function formatNum(n) {
  if (n === null || n === undefined) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function Metric({ icon: Icon, value, className = '' }) {
  return <span className={`inline-flex items-center gap-1 text-xs ${className}`}><Icon className="h-3.5 w-3.5" />{formatNum(value)}</span>
}

function RadialScore({ value = 0, size = 72, stroke = 7 }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value)), offset = c - (pct / 100) * c
  const color = pct >= 85 ? '#00f2fe' : pct >= 65 ? '#38bdf8' : pct >= 45 ? '#f59e0b' : '#f43f5e'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border))" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 6px ${color})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold" style={{ color }}>{pct}%</span>
        <span className="text-[9px] text-muted-foreground -mt-0.5">gancho</span>
      </div>
    </div>
  )
}

function RetentionBadge({ level }) {
  const map = {
    Alta: 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black border-0 shadow-[0_0_16px_rgba(0,242,254,0.4)]',
    Media: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0',
    Baja: 'bg-gradient-to-r from-rose-500 to-red-500 text-white border-0',
  }
  return <Badge className={`${map[level] || 'bg-secondary'} font-medium`}>Retención {level || 'N/A'}</Badge>
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch (e) { toast.error('No se pudo copiar') } }
  return (
    <Button size="sm" variant={copied ? 'default' : 'secondary'} onClick={handleCopy} className={copied ? 'bg-cyan-500 hover:bg-cyan-500 text-black transition-all duration-300' : 'glow-primary transition-all duration-300'}>
      {copied ? (<><Check className="h-4 w-4 mr-1.5" /> ¡Copiado!</>) : (<><Copy className="h-4 w-4 mr-1.5" /> Copiar</>)}
    </Button>
  )
}

function successToast(title, description) {
  toast.custom(() => (
    <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-card/90 backdrop-blur-md px-4 py-3 shadow-[0_8px_32px_rgba(0,242,254,0.20)] min-w-[300px]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 animate-in zoom-in duration-300"><Check className="h-5 w-5 text-cyan-400" strokeWidth={3} /></span>
      <div><div className="text-sm font-semibold text-foreground">{title}</div>{description && <div className="text-xs text-muted-foreground">{description}</div>}</div>
    </div>
  ))
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); document.documentElement.classList.add('theme-fade') }, [])
  if (!mounted) return <div className="h-9 w-9" />
  const isDark = theme !== 'light'
  return (
    <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="glass glass-hover flex h-9 w-9 items-center justify-center rounded-xl text-foreground" aria-label="Cambiar tema">
      {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-primary" />}
    </button>
  )
}

export default function App() {
  const [mode, setMode] = useState('user')
  const [userQuery, setUserQuery] = useState('@MorrrMorrr63705')
  const [topicQuery, setTopicQuery] = useState('')
  const [minFaves, setMinFaves] = useState(100)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [tweets, setTweets] = useState([])
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState({ hours_saved: 0, posts: 0, diagnostics: 0 })
  const [myHandle, setMyHandle] = useState('@MorrrMorrr63705')
  const [rewriting, setRewriting] = useState(null)
  const [scheduling, setScheduling] = useState(null)
  const [scheduledCount, setScheduledCount] = useState(0)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [focusLabel, setFocusLabel] = useState('')
  const [resultMedia, setResultMedia] = useState(null)
  const [expressTopic, setExpressTopic] = useState('')
  const [expressOpen, setExpressOpen] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const [history, setHistory] = useState([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const alertShownRef = useRef(false)

  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('zmeta_handle')
    if (saved) setMyHandle(saved)
    setHistory(sortHistory(loadHistory()))
    fetchMetrics(); fetchScheduled()
  }, [])

  const fetchMetrics = async () => { try { const r = await fetch('/api/metrics'); const j = await r.json(); if (r.ok) setMetrics(j) } catch (e) {} }
  const fetchScheduled = async () => { try { const r = await fetch('/api/schedule'); const j = await r.json(); if (r.ok) setScheduledCount(j.count || 0) } catch (e) {} }

  useEffect(() => {
    const showAlert = async () => {
      try {
        const topic = mode === 'topic' && topicQuery ? topicQuery : 'tu nicho'
        const res = await fetch(`/api/alerts?topic=${encodeURIComponent(topic)}`)
        const j = await res.json()
        const a = j?.alerts?.[Math.floor(Math.random() * (j?.alerts?.length || 1))]
        if (a) {
          toast.custom(() => (
            <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl min-w-[320px] backdrop-blur-md bg-card/90 ${a.type === 'trend' ? 'border-primary/40 shadow-[0_0_24px_hsl(var(--glow)/0.20)]' : 'border-cyan-500/40 shadow-[0_0_24px_rgba(0,242,254,0.20)]'}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${a.type === 'trend' ? 'bg-primary/15' : 'bg-cyan-500/15'} animate-pulse`}>{a.type === 'trend' ? <Radar className="h-5 w-5 text-primary" /> : <TrendingUp className="h-5 w-5 text-cyan-400" />}</span>
              <div><div className="text-sm font-semibold text-foreground">{a.title}</div><div className="text-xs text-muted-foreground mt-0.5 leading-snug">{a.message}</div></div>
            </div>
          ), { duration: 8000 })
        }
      } catch (e) {}
    }
    let interval
    const t = setTimeout(() => { if (!alertShownRef.current) { showAlert(); alertShownRef.current = true } interval = setInterval(showAlert, 45000) }, 3000)
    return () => { clearTimeout(t); if (interval) clearInterval(interval) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveHandle = (v) => { setMyHandle(v); if (typeof window !== 'undefined') localStorage.setItem('zmeta_handle', v) }

  const applyResult = (json, media = null, cached = false) => {
    setData(json); setTweets(json?.analysis?.generatedTweets || []); setResultMedia(media); setFromCache(cached)
    if (json?.metrics) setMetrics(json.metrics)
    const best = Math.max(0, ...(json?.analysis?.generatedTweets || []).map((g) => g.hookStrength || 0))
    if (cached) { toast.custom(() => (<div className="flex items-center gap-3 rounded-2xl border border-violet-500/40 bg-card/90 backdrop-blur-md px-4 py-3 shadow-[0_0_24px_rgba(121,40,202,0.25)]"><History className="h-5 w-5 text-violet-400" /><div className="text-sm font-semibold text-violet-300">Recuperado del Historial · 0 créditos usados</div></div>)) }
    else { successToast('Contenido generado', `${(json?.analysis?.generatedTweets || []).length} propuestas · mejor gancho ${best}%`) }
    if (!cached && best > 85) setTimeout(() => toast.custom(() => (<div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-card/90 backdrop-blur-md px-4 py-3 shadow-[0_0_24px_rgba(245,158,11,0.25)]"><Trophy className="h-6 w-6 text-amber-400 animate-bounce" /><div className="text-sm font-semibold text-amber-500">¡Hito! Gancho de {best}% 🔥</div></div>), { duration: 5000 }), 600)
  }

  const startFocus = (label) => { setLoading(true); setIsFocusMode(true); setFocusLabel(label); setError(''); setData(null); setTweets([]); setResultMedia(null); setFromCache(false) }
  const endFocus = () => { setLoading(false); setIsFocusMode(false) }

  const saveRun = (entry) => {
    setHistory((prev) => { const filtered = prev.filter((h) => h.hash !== entry.hash); const next = sortHistory([entry, ...filtered]); persistHistory(next); return next })
  }

  // Motor genérico con caché local (ahorro de créditos)
  const runGeneric = async ({ apiPath, apiBody, label, media = null, focus }) => {
    const hash = djb2('v1|' + JSON.stringify(apiBody))
    const hit = history.find((h) => h.hash === hash)
    if (hit) { applyResult(hit.result, media, true); return }
    startFocus(focus)
    try {
      const res = await fetch(apiPath, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(apiBody) })
      const json = await res.json()
      if (!res.ok) { setError(json?.error || 'Error inesperado'); toast.error(json?.error || 'Error inesperado') }
      else { applyResult(json, media, false); saveRun({ hash, label, mode: apiBody.type || apiBody.format || 'media', query: apiBody.query || apiBody.topic || 'media', createdAt: new Date().toISOString(), pinned: false, result: json }) }
    } catch (e) { setError('Error de conexión con el servidor'); toast.error('Error de conexión') } finally { endFocus() }
  }

  const runAnalysis = () => {
    const query = mode === 'user' ? userQuery.trim() : topicQuery.trim()
    if (!query) { toast.error(mode === 'user' ? 'Introduce un @username' : 'Introduce o elige una temática'); return }
    runGeneric({ apiPath: '/api/analyze-and-generate', apiBody: { type: mode, query, minFaves }, label: `${mode === 'user' ? '👤' : '#'} ${query}`, focus: mode === 'user' ? `Escaneando el perfil ${query}` : `Escaneando la tendencia "${query}"` })
  }
  const runVision = ({ image, media, mediaType, preview, note }) => {
    runGeneric({ apiPath: '/api/vision-generate', apiBody: { image, media, mediaType, note }, label: `🎬 Media (${mediaType})`, media: preview, focus: 'Analizando media: visión + audio (Whisper)…' })
  }
  const runTemplate = (format) => {
    const topic = expressTopic.trim()
    if (!topic) { toast.error('Escribe una temática para el post express'); return }
    setExpressOpen(false)
    runGeneric({ apiPath: '/api/text-template', apiBody: { format, topic }, label: `🚀 ${TEXT_FORMATS.find((f) => f.key === format)?.label}: ${topic}`, focus: `Creando post express sobre "${topic}"` })
  }

  const rewriteTweet = async (index) => {
    const t = tweets[index]; if (!t) return
    setRewriting(index); setIsFocusMode(true); setFocusLabel('La IA está reescribiendo tu tweet para maximizar el gancho')
    try {
      const res = await fetch('/api/rewrite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t.text, weakPoint: t.weakPoint, style: t.style }) })
      const json = await res.json()
      if (!res.ok) { toast.error(json?.error || 'No se pudo reescribir'); return }
      const updated = [...tweets]; updated[index] = { ...t, text: json.text, rationale: json.rationale, hookStrength: json.hookStrength, retention: json.retention, weakPoint: json.weakPoint, rewritten: true, thread: json.thread || [] }
      setTweets(updated); if (json?.metrics) setMetrics(json.metrics)
      successToast('Tweet reescrito por IA', `Nuevo gancho: ${json.hookStrength}%`)
    } catch (e) { toast.error('Error al reescribir') } finally { setRewriting(null); setIsFocusMode(false) }
  }

  const scheduleDraft = async (index) => {
    const t = tweets[index]; if (!t) return
    setScheduling(index)
    try {
      const res = await fetch('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t.text, style: t.style, hasMedia: !!resultMedia }) })
      const json = await res.json()
      if (!res.ok) { toast.error(json?.error || 'No se pudo programar'); return }
      setScheduledCount(json.count || 0); successToast('Publicación programada', 'Añadida a tu cola de borradores')
    } catch (e) { toast.error('Error al programar') } finally { setScheduling(null) }
  }

  // History drawer actions
  const reloadRun = (item) => { setHistoryOpen(false); applyResult(item.result, null, true) }
  const togglePin = (hash) => { setHistory((prev) => { const next = sortHistory(prev.map((h) => h.hash === hash ? { ...h, pinned: !h.pinned } : h)); persistHistory(next); return next }) }
  const exportRun = (item) => {
    const blob = new Blob([JSON.stringify(item.result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `zmeta-${item.query || 'run'}.json`.replace(/[^a-z0-9.\-]/gi, '_'); a.click(); URL.revokeObjectURL(url)
  }
  const filteredHistory = history.filter((h) => !historySearch || (h.label + h.query).toLowerCase().includes(historySearch.toLowerCase()))

  const analysis = data?.analysis?.patternAnalysis
  const vision = data?.vision
  const audio = data?.audio
  const growth = data?.growth || data?.analysis?.growth || null
  const primeTimes = data?.primeTimes || []

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.35] dark:opacity-100" style={{ backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '40px 40px', maskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%, black 30%, transparent 100%)' }} />
        <div className="absolute -top-40 left-1/3 h-96 w-[36rem] rounded-full bg-primary/15 blur-[130px]" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-accent/15 blur-[130px]" />
      </div>

      {/* Scanning HUD overlay */}
      {isFocusMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="absolute left-0 right-0 h-24 bg-gradient-to-b from-primary/20 to-transparent animate-[scanline_2.2s_linear_infinite]" style={{ top: 0 }} />
          <div className="text-center max-w-md px-6 relative">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[0_0_50px_hsl(var(--glow)/0.5)]"><Loader2 className="h-10 w-10 text-primary-foreground animate-spin" /></div>
            <h3 className="text-xl font-semibold text-foreground">{focusLabel}</h3>
            <p className="mt-2 text-sm text-muted-foreground font-mono tracking-tight">// SCANNING · PROCESSING VIRAL PATTERNS</p>
            <div className="mt-6 flex justify-center gap-1.5">{[0, 1, 2].map((i) => (<span key={i} className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />))}</div>
          </div>
        </div>
      )}

      {/* TOP COMMAND BAR */}
      <header className="shrink-0 h-14 border-b border-border/60 glass z-20 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_16px_hsl(var(--glow)/0.5)]"><Sparkles className="h-4 w-4 text-primary-foreground" /></div>
          <div className="leading-none"><span className="font-bold tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">ViralForge</span><span className="hidden sm:block text-[10px] text-muted-foreground font-mono mt-0.5">Z.META · HUD v3</span></div>
          <div className="hidden md:flex items-center gap-2 ml-3 font-mono text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> GEMINI</span>
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> TWITTERAPI</span>
            <span className="inline-flex items-center gap-1"><Cpu className="h-3 w-3" /> WHISPER</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1"><Clock className="h-3.5 w-3.5 text-cyan-400" /><span className="text-xs font-semibold text-cyan-400">{metrics.hours_saved}h</span></div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1"><CalendarClock className="h-3.5 w-3.5 text-primary" /><span className="text-xs font-semibold text-primary">{scheduledCount}</span></div>
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild><Button size="sm" variant="secondary" className="glow-primary"><History className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Historial</span></Button></SheetTrigger>
            <SheetContent side="right" className="glass border-border/60 w-full sm:max-w-md flex flex-col">
              <SheetHeader><SheetTitle className="flex items-center gap-2"><History className="h-5 w-5 text-violet-400" /> Historial de Análisis</SheetTitle><SheetDescription>Recarga runs anteriores sin gastar créditos. Fija favoritos y exporta.</SheetDescription></SheetHeader>
              <Input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Buscar por tema o handle..." className="mt-4 bg-background/50" />
              <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredHistory.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sin runs guardados todavía.</p>}
                {filteredHistory.map((h) => (
                  <div key={h.hash} className="glass rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><div className="text-sm font-medium text-foreground truncate">{h.label}</div><div className="text-[11px] text-muted-foreground">{new Date(h.createdAt).toLocaleString('es')} · {h.result?.analysis?.generatedTweets?.length || 0} posts</div></div>
                      <button onClick={() => togglePin(h.hash)} className="shrink-0"><Star className={`h-4 w-4 ${h.pinned ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} /></button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="secondary" className="h-7 text-xs flex-1" onClick={() => reloadRun(h)}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Recargar</Button>
                      <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => exportRun(h)}><Download className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <ThemeToggle />
        </div>
      </header>

      {/* APP SHELL: two independent scroll panels */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] relative z-10">
        {/* LEFT PANEL */}
        <aside className="min-h-0 overflow-y-auto border-b lg:border-b-0 lg:border-r border-border/50 p-4 space-y-4">
          <Card className="glass-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <input value={myHandle} onChange={(e) => saveHandle(e.target.value)} className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/60" placeholder="@tu_usuario" />
                <Sheet open={expressOpen} onOpenChange={setExpressOpen}>
                  <SheetTrigger asChild><Button variant="secondary" className="glow-primary shrink-0"><Rocket className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Express</span></Button></SheetTrigger>
                  <SheetContent side="right" className="glass border-border/60 w-full sm:max-w-md">
                    <SheetHeader><SheetTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /> Creación Express solo-texto</SheetTitle><SheetDescription>Genera un post en 1 clic. Elige un formato.</SheetDescription></SheetHeader>
                    <div className="mt-6 space-y-4">
                      <Input value={expressTopic} onChange={(e) => setExpressTopic(e.target.value)} placeholder="Ej. Productividad con IA" className="bg-background/50 h-11" />
                      <div className="space-y-2.5">{TEXT_FORMATS.map((f) => { const Icon = f.icon; return (<button key={f.key} onClick={() => runTemplate(f.key)} className="glass glass-hover w-full flex items-center gap-3 rounded-xl p-3 text-left"><span className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0"><Icon className="h-5 w-5 text-primary-foreground" /></span><span><span className="block text-sm font-medium text-foreground">{f.label}</span><span className="block text-xs text-muted-foreground">{f.desc}</span></span></button>) })}</div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              <Tabs value={mode} onValueChange={setMode} className="w-full">
                <TabsList className="grid grid-cols-3 w-full mb-4">
                  <TabsTrigger value="user" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"><User className="h-3.5 w-3.5 mr-1" /> Usuario</TabsTrigger>
                  <TabsTrigger value="topic" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs"><Hash className="h-3.5 w-3.5 mr-1" /> Temática</TabsTrigger>
                  <TabsTrigger value="media" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-black text-xs"><ImageIcon className="h-3.5 w-3.5 mr-1" /> Media</TabsTrigger>
                </TabsList>
                <TabsContent value="user" className="mt-0 space-y-3">
                  <Input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runAnalysis()} placeholder="@usuario" className="bg-background/50 h-11" />
                  <Button onClick={runAnalysis} disabled={loading} className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">{loading ? 'Analizando...' : (<><Search className="h-4 w-4 mr-2" /> Analizar perfil</>)}</Button>
                </TabsContent>
                <TabsContent value="topic" className="mt-0 space-y-3">
                  <Input value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runAnalysis()} placeholder="Ej. Inteligencia Artificial" className="bg-background/50 h-11" />
                  <Button onClick={runAnalysis} disabled={loading} className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90 glow-primary">{loading ? 'Analizando...' : (<><TrendingUp className="h-4 w-4 mr-2" /> Escanear tendencia</>)}</Button>
                  <div className="flex flex-wrap gap-1.5">{SUGGESTED_TOPICS.map((t) => (<button key={t} onClick={() => setTopicQuery(t)} className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${topicQuery === t ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-secondary/40 text-muted-foreground hover:border-accent/50'}`}>{t}</button>))}</div>
                  <div className="flex items-center gap-2 flex-wrap"><span className="text-[11px] text-muted-foreground">Engagement min:</span>{[100, 500, 1000, 5000].map((v) => (<button key={v} onClick={() => setMinFaves(v)} className={`text-[11px] px-2 py-0.5 rounded-md border ${minFaves === v ? 'border-accent bg-accent/15 text-accent' : 'border-border text-muted-foreground'}`}>{formatNum(v)}+❤️</button>))}</div>
                </TabsContent>
                <TabsContent value="media" className="mt-0"><MediaUploader onGenerate={runVision} loading={loading} /></TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Model tweets / Vision / Audio */}
          {error && !loading && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-destructive text-sm text-center">{error}</div>}
          {loading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}

          {data && !loading && data.originalTweets?.length > 0 && (
            <div>
              {data.userInfo && (
                <div className="glass mb-3 flex items-center gap-3 rounded-xl p-3">
                  <Avatar className="h-11 w-11 border border-border"><AvatarImage src={data.userInfo.profilePicture} /><AvatarFallback className="bg-primary text-primary-foreground">{data.userInfo.name?.[0] || '?'}</AvatarFallback></Avatar>
                  <div className="min-w-0"><div className="flex items-center gap-1 font-semibold text-sm">{data.userInfo.name}{data.userInfo.isBlueVerified && <BadgeCheck className="h-4 w-4 text-sky-400" />}</div><div className="text-xs text-muted-foreground">@{data.userInfo.userName} · {formatNum(data.userInfo.followers)} seg.</div></div>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold"><Activity className="h-4 w-4 text-primary" /> Tweets Modelo <span className="text-[11px] font-normal text-muted-foreground">· por engagement ↓</span></div>
              <div className="space-y-2.5">
                {data.originalTweets.map((t, idx) => (
                  <Card key={t.id} className="glass-hover"><CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1.5"><div className="flex items-center gap-2 min-w-0"><span className="text-[10px] font-mono text-primary">#{idx + 1}</span><span className="text-xs text-muted-foreground truncate">{t.author?.userName ? '@' + t.author.userName : 'X'}</span></div>{t.url && <a href={t.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>}</div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-snug">{t.text}</p>
                    <div className="flex items-center gap-3 mt-2"><Metric icon={Heart} value={t.likes} className="text-rose-400" /><Metric icon={Repeat2} value={t.retweets} className="text-emerald-400" /><Metric icon={MessageCircle} value={t.replies} className="text-sky-400" /><Metric icon={Eye} value={t.views} className="text-muted-foreground" /></div>
                  </CardContent></Card>
                ))}
              </div>
            </div>
          )}

          {data && !loading && (vision || audio) && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold"><ScanText className="h-4 w-4 text-cyan-400" /> Inteligencia Audiovisual</div>
              {resultMedia?.url && (<div className="rounded-xl overflow-hidden border border-border mb-2.5">{resultMedia.type === 'video' ? <video src={resultMedia.url} poster={resultMedia.poster} controls className="w-full max-h-56 object-contain bg-black" /> : resultMedia.type === 'audio' ? <div className="flex items-center gap-2 p-3 bg-secondary/40"><Music className="h-5 w-5 text-primary" /><audio src={resultMedia.url} controls className="w-full" /></div> : <img src={resultMedia.url} className="w-full max-h-56 object-contain bg-black" alt="media" />}</div>)}
              <Card className="glass"><CardContent className="p-3 space-y-2.5">
                {vision?.description && <p className="text-sm text-foreground/90 leading-snug">{vision.description}</p>}
                {vision?.ocr && <div className="rounded-lg bg-secondary/40 p-2.5 text-xs"><div className="flex items-center gap-1.5 text-muted-foreground mb-1"><ScanText className="h-3.5 w-3.5" /> OCR</div><p className="text-foreground/90 whitespace-pre-wrap">{vision.ocr}</p></div>}
                {audio?.transcript && <div className="rounded-lg bg-secondary/40 p-2.5 text-xs"><div className="flex items-center gap-1.5 text-muted-foreground mb-1"><Music className="h-3.5 w-3.5" /> Transcripción</div><p className="text-foreground/90 whitespace-pre-wrap line-clamp-4">{audio.transcript}</p></div>}
                {data.combined_hook_angle && <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs"><span className="text-primary font-medium">Ángulo unificado:</span> <span className="text-foreground/90">{data.combined_hook_angle}</span></div>}
                <div className="flex flex-wrap gap-1.5">{vision?.tone && <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-normal"><Smile className="h-3 w-3 mr-1" />{vision.tone}</Badge>}{audio?.tone && audio.tone !== 'Sin audio' && <Badge className="bg-violet-500/10 text-violet-400 border border-violet-500/20 font-normal"><Music className="h-3 w-3 mr-1" />{audio.tone}</Badge>}{vision?.subjects?.map((s, i) => (<Badge key={i} variant="secondary" className="bg-secondary font-normal">{s}</Badge>))}</div>
              </CardContent></Card>
            </div>
          )}
          {data && !loading && primeTimes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold"><Clock className="h-4 w-4 text-accent" /> Prime Time del nicho <span className="text-[11px] font-normal text-muted-foreground">· ventanas 2h</span></div>
              <Card className="glass"><CardContent className="p-3 space-y-2">
                {primeTimes.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-mono text-foreground/90 flex items-center gap-2">{i === 0 && <Trophy className="h-3.5 w-3.5 text-amber-400" />}{p.window}</span>
                    <span className="text-xs text-muted-foreground">{p.count} tweets · {formatNum(p.score)} pts</span>
                  </div>
                ))}
              </CardContent></Card>
            </div>
          )}
        </aside>

        {/* RIGHT PANEL */}
        <section className="min-h-0 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_16px_hsl(var(--glow)/0.4)]"><Sparkles className="h-4 w-4 text-primary-foreground" /></div><div><h2 className="font-semibold text-sm leading-tight">Ingeniería Viral · Output</h2><p className="text-[11px] text-muted-foreground">Score predictivo + copy optimizado para X</p></div></div>
            {fromCache && <Badge className="bg-violet-500/15 text-violet-300 border border-violet-500/30"><History className="h-3 w-3 mr-1" /> 0 créditos</Badge>}
          </div>

          {!data && !loading && (<div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20"><Zap className="h-10 w-10 mb-3 opacity-40" /><p className="text-sm text-center max-w-xs">Elige Usuario, Temática o Media (o Express), y la IA generará posts con score de viralidad.</p></div>)}
          {loading && (<><Skeleton className="h-32 w-full" /><Skeleton className="h-52 w-full" /><Skeleton className="h-52 w-full" /></>)}

          {analysis && !loading && (
            <Card className="glass border-primary/30"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-primary"><BrainCircuit className="h-4 w-4" /> Análisis de patrones</CardTitle></CardHeader><CardContent className="pt-0">
              <p className="text-sm text-foreground/90 leading-snug">{analysis.summary}</p>
              <div className="grid grid-cols-2 gap-1.5 mt-2.5 text-xs">
                {analysis.hook && <div className="rounded-lg bg-secondary/40 p-2"><span className="text-muted-foreground">Gancho:</span> {analysis.hook}</div>}
                {analysis.tone && <div className="rounded-lg bg-secondary/40 p-2"><span className="text-muted-foreground">Tono:</span> {analysis.tone}</div>}
                {analysis.length && <div className="rounded-lg bg-secondary/40 p-2"><span className="text-muted-foreground">Longitud:</span> {analysis.length}</div>}
                {analysis.format && <div className="rounded-lg bg-secondary/40 p-2"><span className="text-muted-foreground">Formato:</span> {analysis.format}</div>}
              </div>
              {analysis.keyPatterns?.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{analysis.keyPatterns.map((p, i) => (<Badge key={i} variant="secondary" className="bg-primary/10 text-primary border border-primary/20 font-normal">{p}</Badge>))}</div>}
            </CardContent></Card>
          )}

          {growth && !loading && (
            <Card className="glass border-accent/30"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-accent"><Rocket className="h-4 w-4" /> Motor de Crecimiento Viral</CardTitle></CardHeader><CardContent className="pt-0 space-y-3">
              {growth.topBanners?.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 font-mono">Top Banners (overlay video)</div>
                  <div className="space-y-1.5">{growth.topBanners.map((b, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-3 py-2">
                      <span className="text-sm font-bold tracking-tight text-foreground uppercase">{b}</span>
                      <CopyButton text={b} />
                    </div>
                  ))}</div>
                </div>
              )}
              {growth.loopOutro && (
                <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-2.5">
                  <div className="flex items-center justify-between mb-1"><span className="text-[11px] uppercase tracking-wide text-cyan-400 font-mono flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Loop Outro (retención)</span><CopyButton text={growth.loopOutro} /></div>
                  <p className="text-sm text-foreground/90">{growth.loopOutro}</p>
                </div>
              )}
              {growth.replyStrategy && (<p className="text-xs text-muted-foreground"><span className="text-accent">Estrategia de respuestas:</span> {growth.replyStrategy}</p>)}
            </CardContent></Card>
          )}

          {tweets.map((g, i) => {
            const meta = STYLE_META[g.style] || { icon: Sparkles, color: 'text-foreground', accent: 'ring-border', chip: 'bg-secondary text-foreground' }
            const Icon = meta.icon
            const hot = (g.hookStrength || 0) > 85
            const busy = rewriting === i, sched = scheduling === i
            const isThread = Array.isArray(g.thread) && g.thread.length > 1
            return (
              <Card key={i} className={`glass-hover ring-1 ${meta.accent} ${hot ? 'ring-cyan-500/50 shadow-[0_0_24px_rgba(0,242,254,0.18)]' : ''}`}><CardContent className="p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${meta.chip}`}><Icon className="h-3.5 w-3.5" /> {g.style}</div>
                  <div className="flex items-center gap-2">{isThread && <Badge className="bg-sky-500/15 text-sky-400 border border-sky-500/30"><ListOrdered className="h-3 w-3 mr-1" /> Hilo {g.thread.length}</Badge>}{hot && <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 animate-pulse">🔥 Alto potencial</Badge>}{g.rewritten && <Badge className="bg-accent/15 text-accent border border-accent/30">Reescrito ✨</Badge>}</div>
                </div>

                <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-secondary/30 p-3 mb-3">
                  <RadialScore value={g.hookStrength || 0} />
                  <div className="flex-1"><div className="text-xs text-muted-foreground mb-1.5">Retención estimada</div><RetentionBadge level={g.retention} /><div className={`mt-2 text-[11px] ${(g.text || '').length > 280 ? 'text-rose-400' : 'text-muted-foreground'}`}>{(g.text || '').length}/280 caracteres</div></div>
                </div>

                {isThread ? (
                  <div className="space-y-2">{g.thread.map((tw, ti) => (<div key={ti} className="rounded-lg border-l-2 border-primary/50 bg-secondary/20 pl-3 py-1.5"><span className="text-[10px] font-mono text-primary">{ti + 1}/{g.thread.length}</span><p className="text-[15px] text-foreground whitespace-pre-wrap leading-relaxed">{tw}</p></div>))}</div>
                ) : (
                  <p className="text-[15px] text-foreground whitespace-pre-wrap leading-relaxed">{g.text}</p>
                )}

                {g.weakPoint && (
                  <Alert className="mt-3 border-amber-500/30 bg-amber-500/5"><AlertTriangle className="h-4 w-4 text-amber-400" /><AlertTitle className="text-amber-500 text-xs">Punto Débil</AlertTitle><AlertDescription className="text-amber-500/80 text-xs">{g.weakPoint}
                    <Button size="sm" onClick={() => rewriteTweet(i)} disabled={busy} className="mt-2 w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 text-white glow-primary">{busy ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Reescribiendo...</>) : (<><Wand2 className="h-4 w-4 mr-1.5" /> Reescribir con IA</>)}</Button>
                  </AlertDescription></Alert>
                )}

                {g.rationale && (<><Separator className="my-3" /><p className="text-xs text-muted-foreground"><span className="text-foreground/80">Por qué funciona:</span> {g.rationale}</p></>)}

                {g.firstSelfReply && (
                  <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-2.5">
                    <div className="flex items-center justify-between mb-1"><span className="text-[11px] uppercase tracking-wide text-primary font-mono flex items-center gap-1"><MessageCircle className="h-3 w-3" /> Auto-Reply (arranca comentarios)</span><CopyButton text={g.firstSelfReply} /></div>
                    <p className="text-sm text-foreground/90">{g.firstSelfReply}</p>
                  </div>
                )}

                <div className="mt-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 font-mono">// Preview X</div><SocialPreview name="Z.META" handle={myHandle} avatar={data?.userInfo?.profilePicture} text={isThread ? g.thread[0] : g.text} media={resultMedia} /></div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => scheduleDraft(i)} disabled={sched} className="glow-primary">{sched ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> ...</>) : (<><CalendarClock className="h-4 w-4 mr-1.5" /> Programar</>)}</Button>
                  <CopyButton text={isThread ? g.thread.join('\n\n') : g.text} />
                </div>
              </CardContent></Card>
            )
          })}
        </section>
      </main>
    </div>
  )
}
