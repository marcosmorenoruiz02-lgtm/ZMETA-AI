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
  AlertTriangle, Wand2, Loader2, Trophy, Radar, Sun, Moon, ImageIcon, Film,
  ScanText, Smile, CalendarClock, Layers, Rocket, MessageSquareQuote, Lightbulb,
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

function formatNum(n) {
  if (n === null || n === undefined) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function Metric({ icon: Icon, value, className = '' }) {
  return <span className={`inline-flex items-center gap-1 text-xs ${className}`}><Icon className="h-3.5 w-3.5" />{formatNum(value)}</span>
}

function RadialScore({ value = 0, size = 76, stroke = 7 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const offset = c - (pct / 100) * c
  const color = pct >= 85 ? '#10b981' : pct >= 65 ? '#3b82f6' : pct >= 45 ? '#f59e0b' : '#f43f5e'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border))" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 5px ${color}80)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{pct}%</span>
        <span className="text-[9px] text-muted-foreground -mt-0.5">gancho</span>
      </div>
    </div>
  )
}

function RetentionBadge({ level }) {
  const map = {
    Alta: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-[0_0_16px_rgba(16,185,129,0.35)]',
    Media: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0',
    Baja: 'bg-gradient-to-r from-rose-500 to-red-500 text-white border-0',
  }
  return <Badge className={`${map[level] || 'bg-secondary'} font-medium`}>Retención {level || 'N/A'}</Badge>
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch (e) { toast.error('No se pudo copiar') }
  }
  return (
    <Button size="sm" variant={copied ? 'default' : 'secondary'} onClick={handleCopy} className={copied ? 'bg-emerald-500 hover:bg-emerald-500 text-white transition-all duration-300' : 'glow-primary transition-all duration-300'}>
      {copied ? (<><Check className="h-4 w-4 mr-1.5" /> ¡Copiado!</>) : (<><Copy className="h-4 w-4 mr-1.5" /> Copiar</>)}
    </Button>
  )
}

function successToast(title, description) {
  toast.custom(() => (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-card/90 backdrop-blur-md px-4 py-3 shadow-[0_8px_32px_rgba(16,185,129,0.20)] min-w-[300px]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 animate-in zoom-in duration-300"><Check className="h-5 w-5 text-emerald-500" strokeWidth={3} /></span>
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
  const alertShownRef = useRef(false)

  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('zmeta_handle')
    if (saved) setMyHandle(saved)
    fetchMetrics(); fetchScheduled()
  }, [])

  const fetchMetrics = async () => {
    try { const res = await fetch('/api/metrics'); const j = await res.json(); if (res.ok) setMetrics(j) } catch (e) {}
  }
  const fetchScheduled = async () => {
    try { const res = await fetch('/api/schedule'); const j = await res.json(); if (res.ok) setScheduledCount(j.count || 0) } catch (e) {}
  }

  useEffect(() => {
    const showAlert = async () => {
      try {
        const topic = mode === 'topic' && topicQuery ? topicQuery : 'tu nicho'
        const res = await fetch(`/api/alerts?topic=${encodeURIComponent(topic)}`)
        const j = await res.json()
        const a = j?.alerts?.[Math.floor(Math.random() * (j?.alerts?.length || 1))]
        if (a) {
          toast.custom(() => (
            <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl min-w-[320px] backdrop-blur-md bg-card/90 ${a.type === 'trend' ? 'border-primary/40 shadow-[0_0_24px_hsl(var(--glow)/0.20)]' : 'border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.20)]'}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${a.type === 'trend' ? 'bg-primary/15' : 'bg-emerald-500/15'} animate-pulse`}>
                {a.type === 'trend' ? <Radar className="h-5 w-5 text-primary" /> : <TrendingUp className="h-5 w-5 text-emerald-500" />}
              </span>
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

  const applyResult = (json, media = null) => {
    setData(json)
    setTweets(json?.analysis?.generatedTweets || [])
    setResultMedia(media)
    if (json?.metrics) setMetrics(json.metrics)
    const best = Math.max(0, ...(json?.analysis?.generatedTweets || []).map((g) => g.hookStrength || 0))
    successToast('Contenido generado', `${(json?.analysis?.generatedTweets || []).length} propuestas · mejor gancho ${best}%`)
    if (best > 85) {
      setTimeout(() => toast.custom(() => (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-card/90 backdrop-blur-md px-4 py-3 shadow-[0_0_24px_rgba(245,158,11,0.25)]">
          <Trophy className="h-6 w-6 text-amber-400 animate-bounce" /><div className="text-sm font-semibold text-amber-500">¡Hito! Gancho de {best}% detectado 🔥</div>
        </div>
      ), { duration: 5000 }), 600)
    }
  }

  const startFocus = (label) => { setLoading(true); setIsFocusMode(true); setFocusLabel(label); setError(''); setData(null); setTweets([]); setResultMedia(null) }
  const endFocus = () => { setLoading(false); setIsFocusMode(false) }

  const runAnalysis = async () => {
    const query = mode === 'user' ? userQuery.trim() : topicQuery.trim()
    if (!query) { toast.error(mode === 'user' ? 'Introduce un @username' : 'Introduce o elige una temática'); return }
    startFocus(mode === 'user' ? `Analizando el perfil ${query}` : `Escaneando la tendencia "${query}"`)
    try {
      const res = await fetch('/api/analyze-and-generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: mode, query, minFaves }) })
      const json = await res.json()
      if (!res.ok) { setError(json?.error || 'Error inesperado'); toast.error(json?.error || 'Error inesperado') } else { applyResult(json) }
    } catch (e) { setError('Error de conexión con el servidor'); toast.error('Error de conexión') } finally { endFocus() }
  }

  const runVision = async ({ image, preview, note }) => {
    startFocus('Analizando tu media con visión IA')
    try {
      const res = await fetch('/api/vision-generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image, note }) })
      const json = await res.json()
      if (!res.ok) { setError(json?.error || 'Error inesperado'); toast.error(json?.error || 'Error inesperado') } else { applyResult(json, preview) }
    } catch (e) { setError('Error de conexión con el servidor'); toast.error('Error de conexión') } finally { endFocus() }
  }

  const runTemplate = async (format) => {
    const topic = expressTopic.trim()
    if (!topic) { toast.error('Escribe una temática para el post express'); return }
    setExpressOpen(false)
    startFocus(`Creando post "${TEXT_FORMATS.find((f) => f.key === format)?.label}" sobre "${topic}"`)
    try {
      const res = await fetch('/api/text-template', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format, topic }) })
      const json = await res.json()
      if (!res.ok) { setError(json?.error || 'Error inesperado'); toast.error(json?.error || 'Error inesperado') } else { applyResult(json) }
    } catch (e) { setError('Error de conexión con el servidor'); toast.error('Error de conexión') } finally { endFocus() }
  }

  const rewriteTweet = async (index) => {
    const t = tweets[index]; if (!t) return
    setRewriting(index); setIsFocusMode(true); setFocusLabel('La IA está reescribiendo tu tweet para maximizar el gancho')
    try {
      const res = await fetch('/api/rewrite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t.text, weakPoint: t.weakPoint, style: t.style }) })
      const json = await res.json()
      if (!res.ok) { toast.error(json?.error || 'No se pudo reescribir'); return }
      const updated = [...tweets]; updated[index] = { ...t, text: json.text, rationale: json.rationale, hookStrength: json.hookStrength, retention: json.retention, weakPoint: json.weakPoint, rewritten: true }
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
      setScheduledCount(json.count || 0)
      successToast('Publicación programada', 'Añadida a tu cola de borradores')
    } catch (e) { toast.error('Error al programar') } finally { setScheduling(null) }
  }

  const analysis = data?.analysis?.patternAnalysis
  const vision = data?.vision

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.35] dark:opacity-100" style={{ backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '38px 38px', maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 100%)' }} />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[40rem] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-accent/15 blur-[120px]" />
      </div>

      {isFocusMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[0_0_40px_hsl(var(--glow)/0.4)]"><Loader2 className="h-10 w-10 text-primary-foreground animate-spin" /></div>
            <h3 className="text-xl font-semibold text-foreground">{focusLabel}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Modo Enfoque activo · sin distracciones. La IA está procesando…</p>
            <div className="mt-6 flex justify-center gap-1.5">{[0, 1, 2].map((i) => (<span key={i} className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />))}</div>
          </div>
        </div>
      )}

      <div className="relative container max-w-6xl mx-auto px-4 py-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="glass glass-hover inline-flex items-center gap-2.5 rounded-xl px-4 py-2">
              <Clock className="h-5 w-5 text-emerald-500" />
              <div className="leading-tight"><div className="text-lg font-bold text-emerald-500">{metrics.hours_saved} h</div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Tiempo recuperado</div></div>
            </div>
            <div className="glass inline-flex items-center gap-2.5 rounded-xl px-4 py-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              <div className="leading-tight"><div className="text-lg font-bold text-primary">{scheduledCount}</div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Programados</div></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="glass flex items-center gap-2 rounded-xl px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Tu handle:</span>
              <input value={myHandle} onChange={(e) => saveHandle(e.target.value)} className="w-36 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" placeholder="@tu_usuario" />
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Header */}
        <header className="text-center mb-8">
          <div className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-5"><Sparkles className="h-3.5 w-3.5 text-primary" /> ZMETA-AI · Gemini 2.5 Flash Vision + twitterapi.io</div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent pb-1">ViralForge</h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">Motor de creación de alta retención: analiza <span className="text-primary font-medium">perfiles</span>, <span className="text-accent font-medium">temáticas</span> o tu propia <span className="text-emerald-500 font-medium">media</span>, y genera posts optimizados con score de viralidad predictivo.</p>
        </header>

        {/* Control Panel */}
        <Card className="glass-hover">
          <CardContent className="p-5 md:p-6">
            <Tabs value={mode} onValueChange={setMode} className="w-full">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
                <TabsList className="grid grid-cols-3 w-full md:max-w-lg mx-auto">
                  <TabsTrigger value="user" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><User className="h-4 w-4 mr-2" /> Usuario</TabsTrigger>
                  <TabsTrigger value="topic" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"><Hash className="h-4 w-4 mr-2" /> Temática</TabsTrigger>
                  <TabsTrigger value="media" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><ImageIcon className="h-4 w-4 mr-2" /> Media</TabsTrigger>
                </TabsList>
                <Sheet open={expressOpen} onOpenChange={setExpressOpen}>
                  <SheetTrigger asChild>
                    <Button variant="secondary" className="glow-primary shrink-0"><Rocket className="h-4 w-4 mr-2" /> Express solo-texto</Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="glass border-border/60 w-full sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /> Creación Express solo-texto</SheetTitle>
                      <SheetDescription>Genera un post en 1 clic sin necesidad de escanear datos. Elige un formato.</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block">Temática del post</label>
                        <Input value={expressTopic} onChange={(e) => setExpressTopic(e.target.value)} placeholder="Ej. Productividad con IA" className="bg-background/50 h-11" />
                      </div>
                      <div className="space-y-2.5">
                        {TEXT_FORMATS.map((f) => {
                          const Icon = f.icon
                          return (
                            <button key={f.key} onClick={() => runTemplate(f.key)} className="glass glass-hover w-full flex items-center gap-3 rounded-xl p-3 text-left">
                              <span className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0"><Icon className="h-5 w-5 text-primary-foreground" /></span>
                              <span><span className="block text-sm font-medium text-foreground">{f.label}</span><span className="block text-xs text-muted-foreground">{f.desc}</span></span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              <TabsContent value="user" className="mt-0">
                <label className="text-sm text-muted-foreground mb-2 block">Perfil de X a analizar (benchmarking)</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runAnalysis()} placeholder="@usuario" className="bg-background/50 h-11 text-base" />
                  <Button onClick={runAnalysis} disabled={loading} className="h-11 px-6 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">{loading ? 'Analizando...' : (<><Search className="h-4 w-4 mr-2" /> Analizar perfil</>)}</Button>
                </div>
              </TabsContent>

              <TabsContent value="topic" className="mt-0">
                <label className="text-sm text-muted-foreground mb-2 block">Temática, nicho o palabra clave</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runAnalysis()} placeholder="Ej. Inteligencia Artificial" className="bg-background/50 h-11 text-base" />
                  <Button onClick={runAnalysis} disabled={loading} className="h-11 px-6 bg-accent text-accent-foreground hover:bg-accent/90 glow-primary">{loading ? 'Analizando...' : (<><TrendingUp className="h-4 w-4 mr-2" /> Escanear tendencia</>)}</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {SUGGESTED_TOPICS.map((t) => (<button key={t} onClick={() => setTopicQuery(t)} className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-300 ${topicQuery === t ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-secondary/40 text-muted-foreground hover:border-accent/50'}`}>{t}</button>))}
                </div>
                <div className="flex items-center gap-3 mt-5">
                  <span className="text-xs text-muted-foreground">Engagement mínimo:</span>
                  {[100, 500, 1000, 5000].map((v) => (<button key={v} onClick={() => setMinFaves(v)} className={`text-xs px-2.5 py-1 rounded-md border transition-all duration-300 ${minFaves === v ? 'border-accent bg-accent/15 text-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}>{formatNum(v)}+ ❤️</button>))}
                </div>
              </TabsContent>

              <TabsContent value="media" className="mt-0">
                <label className="text-sm text-muted-foreground mb-2 block">Sube una imagen o video para generar un post con Visión IA (OCR + tono + contexto)</label>
                <MediaUploader onGenerate={runVision} loading={loading} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {error && !loading && (<div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive text-sm text-center">{error}</div>)}

        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <div className="space-y-4">{[1, 2, 3].map((i) => (<Skeleton key={i} className="h-28 w-full" />))}</div>
            <div className="space-y-4"><Skeleton className="h-40 w-full" />{[1, 2].map((i) => (<Skeleton key={i} className="h-56 w-full" />))}</div>
          </div>
        )}

        {data && !loading && (
          <div className="mt-8">
            {data.userInfo && (
              <div className="glass mb-6 flex items-center gap-4 rounded-2xl p-4">
                <Avatar className="h-14 w-14 border border-border"><AvatarImage src={data.userInfo.profilePicture} /><AvatarFallback className="bg-primary text-primary-foreground">{data.userInfo.name?.[0] || '?'}</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-semibold">{data.userInfo.name}{data.userInfo.isBlueVerified && <BadgeCheck className="h-4 w-4 text-sky-400" />}</div>
                  <div className="text-sm text-muted-foreground">@{data.userInfo.userName}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-4"><span><b className="text-foreground">{formatNum(data.userInfo.followers)}</b> seguidores</span><span><b className="text-foreground">{formatNum(data.userInfo.following)}</b> siguiendo</span></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT column */}
              <section>
                {data.originalTweets?.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-4"><div className="glass h-8 w-8 rounded-lg flex items-center justify-center"><Search className="h-4 w-4 text-muted-foreground" /></div><div><h2 className="font-semibold text-lg leading-tight">Tweets Modelo</h2><p className="text-xs text-muted-foreground">Escaneados de X · ordenados por engagement</p></div></div>
                    <div className="space-y-3">
                      {data.originalTweets.map((t) => (
                        <Card key={t.id} className="glass-hover"><CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0"><Avatar className="h-7 w-7"><AvatarImage src={t.author?.profilePicture} /><AvatarFallback className="bg-secondary text-[10px]">{t.author?.name?.[0] || 'X'}</AvatarFallback></Avatar><span className="text-sm text-muted-foreground truncate">{t.author?.userName ? '@' + t.author.userName : 'X'}</span></div>
                            {t.url && (<a href={t.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><ExternalLink className="h-4 w-4" /></a>)}
                          </div>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{t.text}</p>
                          <div className="flex items-center gap-4 mt-3 text-muted-foreground"><Metric icon={Heart} value={t.likes} className="text-rose-400" /><Metric icon={Repeat2} value={t.retweets} className="text-emerald-500" /><Metric icon={MessageCircle} value={t.replies} className="text-sky-400" /><Metric icon={Eye} value={t.views} /></div>
                        </CardContent></Card>
                      ))}
                    </div>
                  </>
                )}

                {vision && (
                  <>
                    <div className="flex items-center gap-2 mb-4"><div className="glass h-8 w-8 rounded-lg flex items-center justify-center"><ScanText className="h-4 w-4 text-emerald-500" /></div><div><h2 className="font-semibold text-lg leading-tight">Análisis de Visión</h2><p className="text-xs text-muted-foreground">OCR · tono · contexto de tu media</p></div></div>
                    {resultMedia?.url && (
                      <div className="rounded-2xl overflow-hidden border border-border mb-3">
                        {resultMedia.type === 'video' ? <video src={resultMedia.url} poster={resultMedia.poster} controls className="w-full max-h-64 object-contain bg-black" /> : <img src={resultMedia.url} className="w-full max-h-64 object-contain bg-black" alt="media" />}
                      </div>
                    )}
                    <Card className="glass"><CardContent className="p-4 space-y-3">
                      {vision.description && <p className="text-sm text-foreground/90 leading-relaxed">{vision.description}</p>}
                      {vision.ocr && (<div className="rounded-lg bg-secondary/40 p-3 text-xs"><div className="flex items-center gap-1.5 text-muted-foreground mb-1"><ScanText className="h-3.5 w-3.5" /> Texto detectado (OCR)</div><p className="text-foreground/90 whitespace-pre-wrap">{vision.ocr}</p></div>)}
                      <div className="flex flex-wrap gap-2">
                        {vision.tone && <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-normal"><Smile className="h-3 w-3 mr-1" /> {vision.tone}</Badge>}
                        {vision.subjects?.map((s, i) => (<Badge key={i} variant="secondary" className="bg-primary/10 text-primary border border-primary/20 font-normal">{s}</Badge>))}
                      </div>
                    </CardContent></Card>
                  </>
                )}

                {!data.originalTweets?.length && !vision && (
                  <Card className="glass"><CardContent className="p-6 text-center text-muted-foreground">
                    <Rocket className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm">Post Express generado {data.format ? `· formato ${data.format}` : ''}. Revisa las propuestas y su score a la derecha.</p>
                  </CardContent></Card>
                )}
              </section>

              {/* RIGHT: AI output */}
              <section>
                <div className="flex items-center gap-2 mb-4"><div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_16px_hsl(var(--glow)/0.4)]"><Sparkles className="h-4 w-4 text-primary-foreground" /></div><div><h2 className="font-semibold text-lg leading-tight">Ingeniería Viral con IA</h2><p className="text-xs text-muted-foreground">Score predictivo + propuestas optimizadas</p></div></div>

                {analysis && (
                  <Card className="glass mb-4 border-primary/30"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-primary"><BrainCircuit className="h-4 w-4" /> Análisis de patrones</CardTitle></CardHeader><CardContent className="pt-0">
                    <p className="text-sm text-foreground/90 leading-relaxed">{analysis.summary}</p>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      {analysis.hook && <div className="rounded-lg bg-secondary/40 p-2"><span className="text-muted-foreground">Gancho:</span> <span className="text-foreground/90">{analysis.hook}</span></div>}
                      {analysis.tone && <div className="rounded-lg bg-secondary/40 p-2"><span className="text-muted-foreground">Tono:</span> <span className="text-foreground/90">{analysis.tone}</span></div>}
                      {analysis.length && <div className="rounded-lg bg-secondary/40 p-2"><span className="text-muted-foreground">Longitud:</span> <span className="text-foreground/90">{analysis.length}</span></div>}
                      {analysis.format && <div className="rounded-lg bg-secondary/40 p-2"><span className="text-muted-foreground">Formato:</span> <span className="text-foreground/90">{analysis.format}</span></div>}
                    </div>
                    {analysis.keyPatterns?.length > 0 && (<div className="mt-3 flex flex-wrap gap-1.5">{analysis.keyPatterns.map((p, i) => (<Badge key={i} variant="secondary" className="bg-primary/10 text-primary border border-primary/20 font-normal">{p}</Badge>))}</div>)}
                  </CardContent></Card>
                )}

                <div className="space-y-4">
                  {tweets.map((g, i) => {
                    const meta = STYLE_META[g.style] || { icon: Sparkles, color: 'text-foreground', accent: 'ring-border', chip: 'bg-secondary text-foreground' }
                    const Icon = meta.icon
                    const hot = (g.hookStrength || 0) > 85
                    const busy = rewriting === i
                    const sched = scheduling === i
                    return (
                      <Card key={i} className={`glass-hover ring-1 ${meta.accent} ${hot ? 'ring-emerald-500/50 shadow-[0_0_24px_rgba(16,185,129,0.20)]' : ''}`}><CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${meta.chip}`}><Icon className="h-3.5 w-3.5" /> {g.style}</div>
                          <div className="flex items-center gap-2">{hot && <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 animate-pulse">🔥 Alto potencial</Badge>}{g.rewritten && <Badge className="bg-accent/15 text-accent border border-accent/30">Reescrito ✨</Badge>}</div>
                        </div>

                        <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-secondary/30 p-3 mb-3">
                          <RadialScore value={g.hookStrength || 0} />
                          <div className="flex-1"><div className="text-xs text-muted-foreground mb-1.5">Retención estimada</div><RetentionBadge level={g.retention} /><div className="mt-2 text-[11px] text-muted-foreground">{(g.text || '').length}/280 caracteres</div></div>
                        </div>

                        <p className="text-[15px] text-foreground whitespace-pre-wrap leading-relaxed">{g.text}</p>

                        {g.weakPoint && (
                          <Alert className="mt-3 border-amber-500/30 bg-amber-500/5"><AlertTriangle className="h-4 w-4 text-amber-400" /><AlertTitle className="text-amber-500 text-xs">Punto Débil</AlertTitle><AlertDescription className="text-amber-500/80 text-xs">{g.weakPoint}
                            <Button size="sm" onClick={() => rewriteTweet(i)} disabled={busy} className="mt-2 w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 text-white glow-primary">{busy ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Reescribiendo...</>) : (<><Wand2 className="h-4 w-4 mr-1.5" /> Reescribir automáticamente con IA</>)}</Button>
                          </AlertDescription></Alert>
                        )}

                        {g.rationale && (<><Separator className="my-3" /><p className="text-xs text-muted-foreground"><span className="text-foreground/80">Por qué funciona:</span> {g.rationale}</p></>)}

                        <div className="mt-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Previsualización en X</div><SocialPreview name="Z.META" handle={myHandle} avatar={data?.userInfo?.profilePicture} text={g.text} media={resultMedia} /></div>

                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => scheduleDraft(i)} disabled={sched} className="glow-primary">{sched ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Programando...</>) : (<><CalendarClock className="h-4 w-4 mr-1.5" /> Programar publicación</>)}</Button>
                          <CopyButton text={g.text} />
                        </div>
                      </CardContent></Card>
                    )
                  })}
                </div>
              </section>
            </div>
          </div>
        )}

        {!data && !loading && !error && (<div className="mt-16 text-center text-muted-foreground"><Zap className="h-10 w-10 mx-auto mb-3 opacity-40" /><p className="text-sm">Elige un modo (Usuario, Temática o Media), o usa Express solo-texto, y deja que la IA haga la ingeniería inversa viral.</p></div>)}
      </div>
    </div>
  )
}
