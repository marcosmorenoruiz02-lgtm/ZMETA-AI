'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Sparkles,
  Search,
  User,
  Hash,
  Heart,
  Repeat2,
  MessageCircle,
  Eye,
  Copy,
  Check,
  Zap,
  TrendingUp,
  ExternalLink,
  Flame,
  BrainCircuit,
  BadgeCheck,
} from 'lucide-react'
import { toast } from 'sonner'

const SUGGESTED_TOPICS = [
  'Inteligencia Artificial',
  'SaaS',
  'Finanzas personales',
  'Marketing digital',
  'Productividad',
  'Startups',
  'Cripto',
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
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-1.5" /> ¡Copiado!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-1.5" /> Copiar
        </>
      )}
    </Button>
  )
}

export default function App() {
  const [mode, setMode] = useState('user')
  const [userQuery, setUserQuery] = useState('@MorrrMorrr63705')
  const [topicQuery, setTopicQuery] = useState('')
  const [minFaves, setMinFaves] = useState(100)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const runAnalysis = async () => {
    const query = mode === 'user' ? userQuery.trim() : topicQuery.trim()
    if (!query) {
      toast.error(mode === 'user' ? 'Introduce un @username' : 'Introduce o elige una temática')
      return
    }
    setLoading(true)
    setError('')
    setData(null)
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
        toast.success('Análisis completado')
      }
    } catch (e) {
      setError('Error de conexión con el servidor')
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const analysis = data?.analysis?.patternAnalysis
  const generated = data?.analysis?.generatedTweets || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-zinc-100">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[40rem] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-[120px]" />
      </div>

      <div className="relative container max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-xs text-zinc-400 mb-5 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Potenciado por Gemini 2.5 Flash + twitterapi.io
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
            ViralForge
          </h1>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto text-base md:text-lg">
            Escanea tweets virales por <span className="text-indigo-300">perfil</span> o{' '}
            <span className="text-fuchsia-300">temática</span>, aprende de sus patrones ganadores y genera tus
            propias versiones optimizadas listas para copiar y pegar en X.
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
                  <Input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runAnalysis()}
                    placeholder="@usuario"
                    className="bg-zinc-950/60 border-zinc-800 h-11 text-base"
                  />
                  <Button
                    onClick={runAnalysis}
                    disabled={loading}
                    className="h-11 px-6 bg-indigo-600 hover:bg-indigo-500"
                  >
                    {loading ? 'Analizando...' : (<><Search className="h-4 w-4 mr-2" /> Analizar perfil</>)}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="topic" className="mt-0">
                <label className="text-sm text-zinc-400 mb-2 block">Temática, nicho o palabra clave</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    value={topicQuery}
                    onChange={(e) => setTopicQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runAnalysis()}
                    placeholder="Ej. Inteligencia Artificial"
                    className="bg-zinc-950/60 border-zinc-800 h-11 text-base"
                  />
                  <Button
                    onClick={runAnalysis}
                    disabled={loading}
                    className="h-11 px-6 bg-fuchsia-600 hover:bg-fuchsia-500"
                  >
                    {loading ? 'Analizando...' : (<><TrendingUp className="h-4 w-4 mr-2" /> Escanear tendencia</>)}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {SUGGESTED_TOPICS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTopicQuery(t)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        topicQuery === t
                          ? 'border-fuchsia-500 bg-fuchsia-500/15 text-fuchsia-200'
                          : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-5">
                  <span className="text-xs text-zinc-500">Engagement mínimo:</span>
                  {[100, 500, 1000, 5000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMinFaves(v)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        minFaves === v
                          ? 'border-fuchsia-500 bg-fuchsia-500/15 text-fuchsia-200'
                          : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      {formatNum(v)}+ ❤️
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Error */}
        {error && !loading && (
          <div className="mt-6 rounded-lg border border-rose-900/50 bg-rose-950/30 p-4 text-rose-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full bg-zinc-900" />
              ))}
            </div>
            <div className="space-y-4">
              <Skeleton className="h-40 w-full bg-zinc-900" />
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full bg-zinc-900" />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <div className="mt-8">
            {/* User info banner */}
            {data.userInfo && (
              <div className="mb-6 flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <Avatar className="h-14 w-14 border border-zinc-700">
                  <AvatarImage src={data.userInfo.profilePicture} />
                  <AvatarFallback className="bg-indigo-600">{data.userInfo.name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {data.userInfo.name}
                    {data.userInfo.isBlueVerified && <BadgeCheck className="h-4 w-4 text-sky-400" />}
                  </div>
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
                  <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Search className="h-4 w-4 text-zinc-300" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg leading-tight">Tweets Modelo</h2>
                    <p className="text-xs text-zinc-500">Escaneados de X · ordenados por engagement</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {data.originalTweets?.map((t) => (
                    <Card key={t.id} className="border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={t.author?.profilePicture} />
                              <AvatarFallback className="bg-zinc-700 text-[10px]">{t.author?.name?.[0] || 'X'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-zinc-300 truncate">
                              {t.author?.userName ? '@' + t.author.userName : 'X'}
                            </span>
                          </div>
                          {t.url && (
                            <a href={t.url} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-300">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
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
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-600 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg leading-tight">Ingeniería Viral con IA</h2>
                    <p className="text-xs text-zinc-500">Análisis de patrones + 3 propuestas optimizadas</p>
                  </div>
                </div>

                {/* Pattern analysis */}
                {analysis && (
                  <Card className="border-indigo-900/40 bg-indigo-950/20 mb-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-indigo-200">
                        <BrainCircuit className="h-4 w-4" /> Análisis de patrones
                      </CardTitle>
                    </CardHeader>
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
                          {analysis.keyPatterns.map((p, i) => (
                            <Badge key={i} variant="secondary" className="bg-indigo-500/10 text-indigo-200 border border-indigo-500/20 font-normal">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Generated tweets */}
                <div className="space-y-3">
                  {generated.map((g, i) => {
                    const meta = STYLE_META[g.style] || { icon: Sparkles, color: 'text-zinc-300', ring: 'ring-zinc-700', bg: 'bg-zinc-800' }
                    const Icon = meta.icon
                    return (
                      <Card key={i} className={`border-zinc-800 bg-zinc-900/40 ring-1 ${meta.ring}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>
                              <Icon className="h-3.5 w-3.5" /> {g.style}
                            </div>
                            <CopyButton text={g.text} />
                          </div>
                          <p className="text-[15px] text-zinc-100 whitespace-pre-wrap leading-relaxed">{g.text}</p>
                          {g.rationale && (
                            <>
                              <Separator className="my-3 bg-zinc-800" />
                              <p className="text-xs text-zinc-500"><span className="text-zinc-400">Por qué funciona:</span> {g.rationale}</p>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Empty state */}
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
