'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Hash, Search, User } from 'lucide-react'
import { SUGGESTED_TOPICS, formatNum } from '@/lib/client/copy'

const MIN_OPTIONS = [100, 500, 1000, 5000]

export default function AnalyzePanel({ studio }) {
  const { mode, setMode, userQuery, setUserQuery, topicQuery, setTopicQuery, minFaves, setMinFaves, loading, runAnalysis } = studio
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inspírate en lo que ya funciona</h1>
        <p className="mt-1 text-sm text-muted-foreground">Elige un perfil o un tema. Preparamos 3 tweets listos para copiar.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setMode('topic')} className={`rounded-2xl border px-3 py-3 text-left transition-colors ${mode === 'topic' ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary/40'}`}>
          <Hash className="h-4 w-4 mb-2 text-primary" />
          <div className="text-sm font-medium">Un tema</div>
          <div className="text-xs text-muted-foreground">Ideas de lo que se está hablando</div>
        </button>
        <button type="button" onClick={() => setMode('user')} className={`rounded-2xl border px-3 py-3 text-left transition-colors ${mode === 'user' ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary/40'}`}>
          <User className="h-4 w-4 mb-2 text-primary" />
          <div className="text-sm font-medium">Un perfil</div>
          <div className="text-xs text-muted-foreground">Escribe con la voz de esa cuenta</div>
        </button>
      </div>

      {mode === 'topic' ? (
        <div className="space-y-3">
          <Input value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runAnalysis()} placeholder="Por ejemplo, inteligencia artificial" className="h-12 text-base" />
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TOPICS.map((topic) => (
              <button key={topic} type="button" onClick={() => setTopicQuery(topic)} className={`rounded-full border px-3 py-1 text-xs ${topicQuery === topic ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'}`}>{topic}</button>
            ))}
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Solo tweets con al menos estos me gusta</p>
            <div className="flex flex-wrap gap-2">
              {MIN_OPTIONS.map((v) => (
                <button key={v} type="button" onClick={() => setMinFaves(v)} className={`rounded-lg border px-2.5 py-1 text-xs ${minFaves === v ? 'border-primary bg-primary/10' : 'border-border text-muted-foreground'}`}>{formatNum(v)}+</button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runAnalysis()} placeholder="@usuario" className="h-12 text-base" />
      )}

      <Button onClick={runAnalysis} disabled={loading} className="h-12 w-full text-base">
        <Search className="mr-2 h-4 w-4" />
        {loading ? 'Trabajando…' : 'Crear 3 tweets'}
      </Button>
    </section>
  )
}
