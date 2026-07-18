'use client'

import { useState, useEffect, useRef } from 'react'
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
  Zap, TrendingUp, ExternalLink, Flame, BrainCircuit, BadgeCheck, Clock, Bell,
  AlertTriangle, Wand2, Loader2, Trophy, Radar,
} from 'lucide-react'
import { toast } from 'sonner'

const SUGGESTED_TOPICS = [
  'Inteligencia Artificial', 'SaaS', 'Finanzas personales', 'Marketing digital',
  'Productividad', 'Startups', 'Cripto',
]

const STYLE_META = {
  'Educativo / Lista': { icon: BrainCircuit, color: 'text-sky-400', ring: 'ring-sky-500/30', bg: 'bg-sky-500/10' },
  'Provocativo / Opinión': { icon: Flame, color: 'text-rose-400', ring: 'ring-rose-500/30', bg: 'bg-rose-500/10' },
  'Directo / Gancho corto': { icon: Zap, color: 'text-amber-400', ring: 'ring-amber-500/30', bg: 'bg-amber-500/10' },
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
  const color = pct >= 85 ? '#34d399' : pct >= 65 ? '#818cf8' : pct >= 45 ? '#fbbf24' : '#fb7185'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#27272a" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{pct}%</span>
        <span className="text-[9px] text-zinc-500 -mt-0.5">gancho</span>
      </div>
    </div>
  )
}

function RetentionBadge({ level }) {
  const map = {
    Alta: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0',
    Media: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0',
    Baja: 'bg-gradient-to-r from-rose-500 to-red-500 text-white border-0',
  }
  return <Badge className={`${map[level] || 'bg-zinc-700'} font-medium`}>Retención {level || 'N/A'}</Badge>
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
      className={copied ? 'bg-emerald-600 hover:bg-emerald-600 text-white transition-all' : 'transition-all'}
    >
      {copied ? (<><Check className="h-4 w-4 mr-1.5" /> ¡Copiado!</>) : (<><Copy className="h-4 w-4 mr-1.5" /> Copiar</>)}
    </Button>
  )
}

// Toast enriquecido con check animado
function successToast(title, description) {
  toast.custom((t) => (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-zinc-900 px-4 py-3 shadow-2xl shadow-emerald-500/10 min-w-[300px]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 animate-in zoom-in duration-300">
        <Check className="h-5 w-5 text-emerald-400" strokeWidth={3} />
      </span>
      <div>
        <div className="text-sm font-semibold text-zinc-100">{title}</div>
        {description && <div className="text-xs text-zinc-400">{description}</div>}
      </div>
    </div>
  ))
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

  // Cargar métricas + handle guardado
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

  // FASE 1.1: Alertas proactivas (fetch al cargar + polling)
  useEffect(() => {
    const showAlert = async () => {
      try {
        const topic = mode === 'topic' && topicQuery ? topicQuery : 'tu nicho'
        const res = await fetch(`/api/alerts?topic=${encodeURIComponent(topic)}`)
        const j = await res.json()
        const a = j?.alerts?.[Math.floor(Math.random() * (j?.alerts?.length || 1))]
        if (a) {
          toast.custom(() => (
            <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl min-w-[320px] ${a.type === 'trend' ? 'border-indigo-500/40 bg-indigo-950/60 shadow-indigo-500/10' : 'border-emerald-500/40 bg-emerald-950/50 shadow-emerald-500/10'}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${a.type === 'trend' ? 'bg-indigo-500/20' : 'bg-emerald-500/20'} animate-pulse`}>
                {a.type === 'trend' ? <Radar className="h-5 w-5 text-indigo-300" /> : <TrendingUp className="h-5 w-5 text-emerald-300" />}
              </span>
              <div>
                <div className="text-sm font-semibold text-zinc-100">{a.title}</div>
                <div className="text-xs text-zinc-300 mt-0.5 leading-snug">{a.message}</div>
              </div>
            </div>
          ), { duration: 8000 })
        }
      } catch (e) {}
    }
    // primer aviso a los 3s, luego cada 45s
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
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-950/50 px-4 py-3 shadow-2xl shadow-amber-500/10">
              <Trophy className="h-6 w-6 text-amber-400 animate-bounce" />
              <div className="text-sm font-semibold text-amber-100">¡Hito! Gancho de {best}% detectado 🔥</div>
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
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-zinc-100">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[40rem] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-[120px]" />
      </div>

      {/* FASE 2.1: Modo Enfoque de fricción cero */}
      {isFocusMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 shadow-2xl shadow-indigo-500/30">
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-100">{focusLabel}</h3>
            <p className="mt-2 text-sm text-zinc-400">Modo Enfoque activo · sin distracciones. La IA está procesando patrones virales…</p>
            <div className="mt-6 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="relative container max-w-6xl mx-auto px-4 py-8">
        {/* Top bar: métrica + handle */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="inline-flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-4 py-2">
            <Clock className="h-5 w-5 text-emerald-400" />
            <div className="leading-tight">
              <div className="text-lg font-bold text-emerald-300">{metrics.hours_saved} h</div>
              <div className="text-[10px] uppercase tracking-wide text-emerald-500/80">Tiempo recuperado</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-1.5">
            <span className="text-xs text-zinc-500">Tu handle:</span>
            <input
              value={myHandle}
              onChange={(e) => saveHandle(e.target.value)}
              className="w-40 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
              placeholder="@tu_usuario"
            />
          </div>
        </div>

        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-xs text-zinc-400 mb-5 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            ZMETA-AI · Gemini 2.5 Flash + twitterapi.io
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
            ViralForge
          </h1>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto text-base md:text-lg">
            Escanea tweets virales por <span className="text-indigo-300">perfil</span> o{' '}
            <span className="text-fuchsia-300">temática</span>, mide su potencial y genera versiones
            optimizadas con score de viralidad predictivo.
          </p>
        </header>

        {/* Control Panel */}
        <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur shadow-2xl shadow-black/40">
          <CardContent className="p-5 md:p-6">
            <Tabs value={mode} onValueChange={setMode} className="w-full">
              <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto bg-zinc-800/70 mb-6">
                <TabsTrigger value="user" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <User className="h-4 w-4 mr-2" /> Buscar por Usuario
                </TabsTrigger>
                <TabsTrigger value="topic" className="data-[state=active]:bg-fuchsia-600 data-[state=active]:text-white">
                  <Hash className="h-4 w-4 mr-2" /> Buscar por Temática
                </TabsTrigger>
              </TabsList>

              <TabsContent value="user" className="mt-0">
                <label className="text-sm text-zinc-400 mb-2 block">Perfil de X a analizar (benchmarking)</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runAnalysis()} placeholder="@usuario" className="bg-zinc-950/60 border-zinc-800 h-11 text-base" />
                  <Button onClick={runAnalysis} disabled={loading} className="h-11 px-6 bg-indigo-600 hover:bg-indigo-500">
                    {loading ? 'Analizando...' : (<><Search className="h-4 w-4 mr-2" /> Analizar perfil</>)}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="topic" className="mt-0">
                <label className="text-sm text-zinc-400 mb-2 block">Temática, nicho o palabra clave</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runAnalysis()} placeholder="Ej. Inteligencia Artificial" className="bg-zinc-950/60 border-zinc-800 h-11 text-base" />
                  <Button onClick={runAnalysis} disabled={loading} className="h-11 px-6 bg-fuchsia-600 hover:bg-fuchsia-500">
                    {loading ? 'Analizando...' : (<><TrendingUp className="h-4 w-4 mr-2" /> Escanear tendencia</>)}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {SUGGESTED_TOPICS.map((t) => (
                    <button key={t} onClick={() => setTopicQuery(t)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${topicQuery === t ? 'border-fuchsia-500 bg-fuchsia-500/15 text-fuchsia-200' : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'}`}>{t}</button>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-5">
                  <span className="text-xs text-zinc-500">Engagement mínimo:</span>
                  {[100, 500, 1000, 5000].map((v) => (
                    <button key={v} onClick={() => setMinFaves(v)} className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${minFaves === v ? 'border-fuchsia-500 bg-fuchsia-500/15 text-fuchsia-200' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>{formatNum(v)}+ ❤️</button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {error && !loading && (
          <div className="mt-6 rounded-lg border border-rose-900/50 bg-rose-950/30 p-4 text-rose-300 text-sm text-center">{error}</div>
        )}

        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <div className="space-y-4">{[1, 2, 3].map((i) => (<Skeleton key={i} className="h-28 w-full bg-zinc-900" />))}</div>
            <div className="space-y-4"><Skeleton className="h-40 w-full bg-zinc-900" />{[1, 2].map((i) => (<Skeleton key={i} className="h-56 w-full bg-zinc-900" />))}</div>
          </div>
        )}

        {data && !loading && (
          <div className="mt-8">
            {data.userInfo && (
              <div className="mb-6 flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <Avatar className="h-14 w-14 border border-zinc-700">
                  <AvatarImage src={data.userInfo.profilePicture} />
                  <AvatarFallback className="bg-indigo-600">{data.userInfo.name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-semibold">{data.userInfo.name}{data.userInfo.isBlueVerified && <BadgeCheck className="h-4 w-4 text-sky-400" />}</div>
                  <div className="text-sm text-zinc-500">@{data.userInfo.userName}</div>
                  <div className="text-xs text-zinc-400 mt-1 flex gap-4">
                    <span><b className="text-zinc-200">{formatNum(data.userInfo.followers)}</b> seguidores</span>
                    <span><b className="text-zinc-200">{formatNum(data.userInfo.following)}</b> siguiendo</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT: original tweets */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center"><Search className="h-4 w-4 text-zinc-300" /></div>
                  <div><h2 className="font-semibold text-lg leading-tight">Tweets Modelo</h2><p className="text-xs text-zinc-500">Escaneados de X · ordenados por engagement</p></div>
                </div>
                <div className="space-y-3">
                  {data.originalTweets?.map((t) => (
                    <Card key={t.id} className="border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-7 w-7"><AvatarImage src={t.author?.profilePicture} /><AvatarFallback className="bg-zinc-700 text-[10px]">{t.author?.name?.[0] || 'X'}</AvatarFallback></Avatar>
                            <span className="text-sm text-zinc-300 truncate">{t.author?.userName ? '@' + t.author.userName : 'X'}</span>
                          </div>
                          {t.url && (<a href={t.url} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-300"><ExternalLink className="h-4 w-4" /></a>)}
                        </div>
                        <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{t.text}</p>
                        <div className="flex items-center gap-4 mt-3 text-zinc-500">
                          <Metric icon={Heart} value={t.likes} className="text-rose-400/80" />
                          <Metric icon={Repeat2} value={t.retweets} className="text-emerald-400/80" />
                          <Metric icon={MessageCircle} value={t.replies} className="text-sky-400/80" />
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
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-600 flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>
                  <div><h2 className="font-semibold text-lg leading-tight">Ingeniería Viral con IA</h2><p className="text-xs text-zinc-500">Score predictivo + 3 propuestas optimizadas</p></div>
                </div>

                {analysis && (
                  <Card className="border-indigo-900/40 bg-indigo-950/20 mb-4">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-indigo-200"><BrainCircuit className="h-4 w-4" /> Análisis de patrones</CardTitle></CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-zinc-300 leading-relaxed">{analysis.summary}</p>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        {analysis.hook && <div className="rounded-md bg-zinc-900/60 p-2"><span className="text-zinc-500">Gancho:</span> <span className="text-zinc-300">{analysis.hook}</span></div>}
                        {analysis.tone && <div className="rounded-md bg-zinc-900/60 p-2"><span className="text-zinc-500">Tono:</span> <span className="text-zinc-300">{analysis.tone}</span></div>}
                        {analysis.length && <div className="rounded-md bg-zinc-900/60 p-2"><span className="text-zinc-500">Longitud:</span> <span className="text-zinc-300">{analysis.length}</span></div>}
                        {analysis.format && <div className="rounded-md bg-zinc-900/60 p-2"><span className="text-zinc-500">Formato:</span> <span className="text-zinc-300">{analysis.format}</span></div>}
                      </div>
                      {analysis.keyPatterns?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {analysis.keyPatterns.map((p, i) => (<Badge key={i} variant="secondary" className="bg-indigo-500/10 text-indigo-200 border border-indigo-500/20 font-normal">{p}</Badge>))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Generated tweets con Score de Viralidad Predictivo */}
                <div className="space-y-4">
                  {tweets.map((g, i) => {
                    const meta = STYLE_META[g.style] || { icon: Sparkles, color: 'text-zinc-300', ring: 'ring-zinc-700', bg: 'bg-zinc-800' }
                    const Icon = meta.icon
                    const hot = (g.hookStrength || 0) > 85
                    const busy = rewriting === i
                    return (
                      <Card key={i} className={`border-zinc-800 bg-zinc-900/40 ring-1 ${meta.ring} ${hot ? 'shadow-lg shadow-emerald-500/10 ring-emerald-500/40' : ''} transition-all`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}><Icon className="h-3.5 w-3.5" /> {g.style}</div>
                            <div className="flex items-center gap-2">
                              {hot && <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 animate-pulse">🔥 Alto potencial</Badge>}
                              {g.rewritten && <Badge className="bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">Reescrito ✨</Badge>}
                            </div>
                          </div>

                          {/* Sub-grid métrica: anillo + retención */}
                          <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 mb-3">
                            <RadialScore value={g.hookStrength || 0} />
                            <div className="flex-1">
                              <div className="text-xs text-zinc-500 mb-1.5">Retención estimada</div>
                              <RetentionBadge level={g.retention} />
                              <div className="mt-2 text-[11px] text-zinc-500">{(g.text || '').length}/280 caracteres</div>
                            </div>
                          </div>

                          <p className="text-[15px] text-zinc-100 whitespace-pre-wrap leading-relaxed">{g.text}</p>

                          {/* Alerta punto débil + reescritura */}
                          {g.weakPoint && (
                            <Alert className="mt-3 border-amber-500/30 bg-amber-950/20">
                              <AlertTriangle className="h-4 w-4 text-amber-400" />
                              <AlertTitle className="text-amber-300 text-xs">Punto Débil</AlertTitle>
                              <AlertDescription className="text-amber-200/80 text-xs">
                                {g.weakPoint}
                                <Button size="sm" onClick={() => rewriteTweet(i)} disabled={busy} className="mt-2 w-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white">
                                  {busy ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Reescribiendo...</>) : (<><Wand2 className="h-4 w-4 mr-1.5" /> Reescribir automáticamente con IA</>)}
                                </Button>
                              </AlertDescription>
                            </Alert>
                          )}

                          {g.rationale && (<><Separator className="my-3 bg-zinc-800" /><p className="text-xs text-zinc-500"><span className="text-zinc-400">Por qué funciona:</span> {g.rationale}</p></>)}

                          {/* FASE 3.2: Previsualización realista del feed */}
                          <div className="mt-3">
                            <div className="text-[11px] uppercase tracking-wide text-zinc-600 mb-1.5">Previsualización en X</div>
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
          <div className="mt-16 text-center text-zinc-600">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Elige un modo, introduce tu búsqueda y deja que la IA haga la ingeniería inversa viral.</p>
          </div>
        )}
      </div>
    </div>
  )
}
