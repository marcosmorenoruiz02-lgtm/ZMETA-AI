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
import SocialPreview from '@/components/social-preview'
import {
  Sparkles, Search, User, Hash, Heart, Repeat2, MessageCircle, Eye, Copy, Check,
  Zap, TrendingUp, ExternalLink, Flame, BrainCircuit, BadgeCheck, Clock,
  AlertTriangle, Wand2, Loader2, Trophy, Radar, Sun, Moon,
} from 'lucide-react'
import { toast } from 'sonner'

const SUGGESTED_TOPICS = [
  'Inteligencia Artificial', 'SaaS', 'Finanzas personales', 'Marketing digital',
  'Productividad', 'Startups', 'Cripto',
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
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {formatNum(value)}
    </span>
  )
}

// FASE 3.1: Anillo radial de Poder de Gancho
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
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 5px ${color}80)` }}
        />
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
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      toast.error('No se pudo copiar')
    }
  }
  return (
    <Button
      size="sm"
      variant={copied ? 'default' : 'secondary'}
      onClick={handleCopy}
      className={copied ? 'bg-emerald-500 hover:bg-emerald-500 text-white transition-all duration-300' : 'glow-primary transition-all duration-300'}
    >
      {copied ? (<><Check className="h-4 w-4 mr-1.5" /> ¡Copiado!</>) : (<><Copy className="h-4 w-4 mr-1.5" /> Copiar</>)}
    </Button>
  )
}

function successToast(title, description) {
  toast.custom(() => (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-card/90 backdrop-blur-md px-4 py-3 shadow-[0_8px_32px_rgba(16,185,129,0.20)] min-w-[300px]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 animate-in zoom-in duration-300">
        <Check className="h-5 w-5 text-emerald-500" strokeWidth={3} />
      </span>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
    </div>
  ))
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    document.documentElement.classList.add('theme-fade')
  }, [])
  if (!mounted) return <div className="h-9 w-9" />
  const isDark = theme !== 'light'
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="glass glass-hover flex h-9 w-9 items-center justify-center rounded-xl text-foreground"
      aria-label="Cambiar tema"
    >
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
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [focusLabel, setFocusLabel] = useState('')
  const alertShownRef = useRef(false)

  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('zmeta_handle')
    if (saved) setMyHandle(saved)
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics')
      const j = await res.json()
      if (res.ok) setMetrics(j)
    } catch (e) {}
  }

  // FASE 1.1: Alertas proactivas
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
              <div>
                <div className="text-sm font-semibold text-foreground">{a.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{a.message}</div>
              </div>
            </div>
          ), { duration: 8000 })
        }
      } catch (e) {}
    }
    let interval
    const t = setTimeout(() => {
      if (!alertShownRef.current) { showAlert(); alertShownRef.current = true }
      interval = setInterval(showAlert, 45000)
    }, 3000)
    return () => { clearTimeout(t); if (interval) clearInterval(interval) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveHandle = (v) => {
    setMyHandle(v)
    if (typeof window !== 'undefined') localStorage.setItem('zmeta_handle', v)
  }

  const runAnalysis = async () => {
    const query = mode === 'user' ? userQuery.trim() : topicQuery.trim()
    if (!query) {
      toast.error(mode === 'user' ? 'Introduce un @username' : 'Introduce o elige una temática')
      return
    }
    setLoading(true)
    setIsFocusMode(true)
    setFocusLabel(mode === 'user' ? `Analizando el perfil ${query}` : `Escaneando la tendencia "${query}"`)
    setError('')
    setData(null)
    setTweets([])
    try {
      const res = await fetch('/api/analyze-and-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mode, query, minFaves }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Error inesperado')
        toast.error(json?.error || 'Error inesperado')
      } else {
        setData(json)
        setTweets(json?.analysis?.generatedTweets || [])
        if (json?.metrics) setMetrics(json.metrics)
        const best = Math.max(0, ...(json?.analysis?.generatedTweets || []).map((g) => g.hookStrength || 0))
        successToast('Análisis completado', `3 propuestas generadas · mejor gancho ${best}%`)
        if (best > 85) {
          setTimeout(() => toast.custom(() => (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-card/90 backdrop-blur-md px-4 py-3 shadow-[0_0_24px_rgba(245,158,11,0.25)]">
              <Trophy className="h-6 w-6 text-amber-400 animate-bounce" />
              <div className="text-sm font-semibold text-amber-500">¡Hito! Gancho de {best}% detectado 🔥</div>
            </div>
          ), { duration: 5000 }), 600)
        }
      }
    } catch (e) {
      setError('Error de conexión con el servidor')
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
      setIsFocusMode(false)
    }
  }

  const rewriteTweet = async (index) => {
    const t = tweets[index]
    if (!t) return
    setRewriting(index)
    setIsFocusMode(true)
    setFocusLabel('La IA está reescribiendo tu tweet para maximizar el gancho')
    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t.text, weakPoint: t.weakPoint, style: t.style }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json?.error || 'No se pudo reescribir'); return }
      const updated = [...tweets]
      updated[index] = { ...t, text: json.text, rationale: json.rationale, hookStrength: json.hookStrength, retention: json.retention, weakPoint: json.weakPoint, rewritten: true }
      setTweets(updated)
      if (json?.metrics) setMetrics(json.metrics)
      successToast('Tweet reescrito por IA', `Nuevo gancho: ${json.hookStrength}%`)
    } catch (e) {
      toast.error('Error al reescribir')
    } finally {
      setRewriting(null)
      setIsFocusMode(false)
    }
  }

  const analysis = data?.analysis?.patternAnalysis

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient glow + grid */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.35] dark:opacity-100" style={{ backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '38px 38px', maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 100%)' }} />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[40rem] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-accent/15 blur-[120px]" />
      </div>

      {/* FASE 2.1: Modo Enfoque */}
      {isFocusMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[0_0_40px_hsl(var(--glow)/0.4)]">
              <Loader2 className="h-10 w-10 text-primary-foreground animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">{focusLabel}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Modo Enfoque activo · sin distracciones. La IA está procesando patrones virales…</p>
            <div className="mt-6 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="relative container max-w-6xl mx-auto px-4 py-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="glass glass-hover inline-flex items-center gap-2.5 rounded-xl px-4 py-2">
            <Clock className="h-5 w-5 text-emerald-500" />
            <div className="leading-tight">
              <div className="text-lg font-bold text-emerald-500">{metrics.hours_saved} h</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Tiempo recuperado</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="glass flex items-center gap-2 rounded-xl px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Tu handle:</span>
              <input value={myHandle} onChange={(e) => saveHandle(e.target.value)} className="w-40 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" placeholder="@tu_usuario" />
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Header */}
        <header className="text-center mb-8">
          <div className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            ZMETA-AI · Gemini 2.5 Flash + twitterapi.io
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent pb-1">
            ViralForge
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            Escanea tweets virales por <span className="text-primary font-medium">perfil</span> o{' '}
            <span className="text-accent font-medium">temática</span>, mide su potencial y genera versiones
            optimizadas con score de viralidad predictivo.
          </p>
        </header>

        {/* Control Panel */}
        <Card className="glass-hover">
          <CardContent className="p-5 md:p-6">
            <Tabs value={mode} onValueChange={setMode} className="w-full">
              <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-6">
                <TabsTrigger value="user" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <User className="h-4 w-4 mr-2" /> Buscar por Usuario
                </TabsTrigger>
                <TabsTrigger value="topic" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                  <Hash className="h-4 w-4 mr-2" /> Buscar por Temática
                </TabsTrigger>
              </TabsList>

              <TabsContent value="user" className="mt-0">
                <label className="text-sm text-muted-foreground mb-2 block">Perfil de X a analizar (benchmarking)</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runAnalysis()} placeholder="@usuario" className="bg-background/50 h-11 text-base" />
                  <Button onClick={runAnalysis} disabled={loading} className="h-11 px-6 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
                    {loading ? 'Analizando...' : (<><Search className="h-4 w-4 mr-2" /> Analizar perfil</>)}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="topic" className="mt-0">
                <label className="text-sm text-muted-foreground mb-2 block">Temática, nicho o palabra clave</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runAnalysis()} placeholder="Ej. Inteligencia Artificial" className="bg-background/50 h-11 text-base" />
                  <Button onClick={runAnalysis} disabled={loading} className="h-11 px-6 bg-accent text-accent-foreground hover:bg-accent/90 glow-primary">
                    {loading ? 'Analizando...' : (<><TrendingUp className="h-4 w-4 mr-2" /> Escanear tendencia</>)}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {SUGGESTED_TOPICS.map((t) => (
                    <button key={t} onClick={() => setTopicQuery(t)} className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-300 ${topicQuery === t ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-secondary/40 text-muted-foreground hover:border-accent/50'}`}>{t}</button>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-5">
                  <span className="text-xs text-muted-foreground">Engagement mínimo:</span>
                  {[100, 500, 1000, 5000].map((v) => (
                    <button key={v} onClick={() => setMinFaves(v)} className={`text-xs px-2.5 py-1 rounded-md border transition-all duration-300 ${minFaves === v ? 'border-accent bg-accent/15 text-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}>{formatNum(v)}+ ❤️</button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {error && !loading && (
          <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive text-sm text-center">{error}</div>
        )}

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
                  <div className="text-xs text-muted-foreground mt-1 flex gap-4">
                    <span><b className="text-foreground">{formatNum(data.userInfo.followers)}</b> seguidores</span>
                    <span><b className="text-foreground">{formatNum(data.userInfo.following)}</b> siguiendo</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT: original tweets */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="glass h-8 w-8 rounded-lg flex items-center justify-center"><Search className="h-4 w-4 text-muted-foreground" /></div>
                  <div><h2 className="font-semibold text-lg leading-tight">Tweets Modelo</h2><p className="text-xs text-muted-foreground">Escaneados de X · ordenados por engagement</p></div>
                </div>
                <div className="space-y-3">
                  {data.originalTweets?.map((t) => (
                    <Card key={t.id} className="glass-hover">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-7 w-7"><AvatarImage src={t.author?.profilePicture} /><AvatarFallback className="bg-secondary text-[10px]">{t.author?.name?.[0] || 'X'}</AvatarFallback></Avatar>
                            <span className="text-sm text-muted-foreground truncate">{t.author?.userName ? '@' + t.author.userName : 'X'}</span>
                          </div>
                          {t.url && (<a href={t.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><ExternalLink className="h-4 w-4" /></a>)}
                        </div>
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{t.text}</p>
                        <div className="flex items-center gap-4 mt-3 text-muted-foreground">
                          <Metric icon={Heart} value={t.likes} className="text-rose-400" />
                          <Metric icon={Repeat2} value={t.retweets} className="text-emerald-500" />
                          <Metric icon={MessageCircle} value={t.replies} className="text-sky-400" />
                          <Metric icon={Eye} value={t.views} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* RIGHT: AI output */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_16px_hsl(var(--glow)/0.4)]"><Sparkles className="h-4 w-4 text-primary-foreground" /></div>
                  <div><h2 className="font-semibold text-lg leading-tight">Ingeniería Viral con IA</h2><p className="text-xs text-muted-foreground">Score predictivo + 3 propuestas optimizadas</p></div>
                </div>

                {analysis && (
                  <Card className="glass mb-4 border-primary/30">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-primary"><BrainCircuit className="h-4 w-4" /> Análisis de patrones</CardTitle></CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-foreground/90 leading-relaxed">{analysis.summary}</p>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        {analysis.hook && <div className="rounded-lg bg-secondary/40 p-2"><span className="text-muted-foreground">Gancho:</span> <span className="text-foreground/90">{analysis.hook}</span></div>}
                        {analysis.tone && <div className="rounded-lg bg-secondary/40 p-2"><span className="text-muted-foreground">Tono:</span> <span className="text-foreground/90">{analysis.tone}</span></div>}
                        {analysis.length && <div className="rounded-lg bg-secondary/40 p-2"><span className="text-muted-foreground">Longitud:</span> <span className="text-foreground/90">{analysis.length}</span></div>}
                        {analysis.format && <div className="rounded-lg bg-secondary/40 p-2"><span className="text-muted-foreground">Formato:</span> <span className="text-foreground/90">{analysis.format}</span></div>}
                      </div>
                      {analysis.keyPatterns?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {analysis.keyPatterns.map((p, i) => (<Badge key={i} variant="secondary" className="bg-primary/10 text-primary border border-primary/20 font-normal">{p}</Badge>))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-4">
                  {tweets.map((g, i) => {
                    const meta = STYLE_META[g.style] || { icon: Sparkles, color: 'text-foreground', accent: 'ring-border', chip: 'bg-secondary text-foreground' }
                    const Icon = meta.icon
                    const hot = (g.hookStrength || 0) > 85
                    const busy = rewriting === i
                    return (
                      <Card key={i} className={`glass-hover ring-1 ${meta.accent} ${hot ? 'ring-emerald-500/50 shadow-[0_0_24px_rgba(16,185,129,0.20)]' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${meta.chip}`}><Icon className="h-3.5 w-3.5" /> {g.style}</div>
                            <div className="flex items-center gap-2">
                              {hot && <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 animate-pulse">🔥 Alto potencial</Badge>}
                              {g.rewritten && <Badge className="bg-accent/15 text-accent border border-accent/30">Reescrito ✨</Badge>}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-secondary/30 p-3 mb-3">
                            <RadialScore value={g.hookStrength || 0} />
                            <div className="flex-1">
                              <div className="text-xs text-muted-foreground mb-1.5">Retención estimada</div>
                              <RetentionBadge level={g.retention} />
                              <div className="mt-2 text-[11px] text-muted-foreground">{(g.text || '').length}/280 caracteres</div>
                            </div>
                          </div>

                          <p className="text-[15px] text-foreground whitespace-pre-wrap leading-relaxed">{g.text}</p>

                          {g.weakPoint && (
                            <Alert className="mt-3 border-amber-500/30 bg-amber-500/5">
                              <AlertTriangle className="h-4 w-4 text-amber-400" />
                              <AlertTitle className="text-amber-500 text-xs">Punto Débil</AlertTitle>
                              <AlertDescription className="text-amber-500/80 text-xs">
                                {g.weakPoint}
                                <Button size="sm" onClick={() => rewriteTweet(i)} disabled={busy} className="mt-2 w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 text-white glow-primary">
                                  {busy ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Reescribiendo...</>) : (<><Wand2 className="h-4 w-4 mr-1.5" /> Reescribir automáticamente con IA</>)}
                                </Button>
                              </AlertDescription>
                            </Alert>
                          )}

                          {g.rationale && (<><Separator className="my-3" /><p className="text-xs text-muted-foreground"><span className="text-foreground/80">Por qué funciona:</span> {g.rationale}</p></>)}

                          <div className="mt-3">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Previsualización en X</div>
                            <SocialPreview name="Z.META" handle={myHandle} avatar={data?.userInfo?.profilePicture} text={g.text} />
                          </div>

                          <div className="mt-3 flex justify-end"><CopyButton text={g.text} /></div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>
            </div>
          </div>
        )}

        {!data && !loading && !error && (
          <div className="mt-16 text-center text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Elige un modo, introduce tu búsqueda y deja que la IA haga la ingeniería inversa viral.</p>
          </div>
        )}
      </div>
    </div>
  )
}
