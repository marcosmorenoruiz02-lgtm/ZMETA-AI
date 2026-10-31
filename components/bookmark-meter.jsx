'use client'

import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Bookmark, Layers, AlertCircle, CheckCircle2, Loader2, Wand2 } from 'lucide-react'

const GRADE = {
  low: { label: 'Bajo', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  medium: { label: 'Medio', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  high: { label: 'Alto', cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  elite: { label: 'Élite', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
}

const BARS = [
  { key: 'actionability', label: 'Accionable', color: 'bg-violet-500' },
  { key: 'structure', label: 'Estructura', color: 'bg-cyan-500' },
  { key: 'specificity', label: 'Especificidad', color: 'bg-fuchsia-500' },
  { key: 'saveability', label: 'Guardabilidad', color: 'bg-emerald-500' },
]

export default function BookmarkMeter({ data, loading = false, onFix, fixing = null }) {
  const score = data?.score ?? 0
  const g = GRADE[data?.grade] || GRADE.medium
  const bd = data?.breakdown || {}

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-mono">
          <Bookmark className="h-3.5 w-3.5 text-primary" /> Potencial de guardado
          {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        </span>
        {data && <Badge className={`border ${g.cls}`}>{g.label}</Badge>}
      </div>

      <div className="flex items-end gap-3 mb-2">
        <span className="text-4xl font-bold tabular-nums leading-none bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{score}</span>
        <span className="text-xs text-muted-foreground mb-1">/100</span>
      </div>
      <Progress value={score} className="h-2" />

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {BARS.map((b) => (
          <div key={b.key}>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>{b.label}</span><span className="tabular-nums">{bd[b.key] ?? 0}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border/50 overflow-hidden">
              <div className={`h-full rounded-full ${b.color} transition-all duration-500`} style={{ width: `${bd[b.key] ?? 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      {data?.suggested_format && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-2.5">
          <Layers className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <div><span className="text-[10px] uppercase tracking-wide text-primary font-mono">Formato sugerido</span><p className="text-xs text-foreground/90">{data.suggested_format}</p></div>
        </div>
      )}

      {Array.isArray(data?.missing_elements) && data.missing_elements.length > 0 ? (
        <div className="mt-3">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono">Toca una sugerencia y la mejoramos</span>
          <ul className="mt-1.5 space-y-1.5">
            {data.missing_elements.map((m, i) => {
              const isFixing = fixing === m
              const anyFixing = !!fixing
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onFix && onFix(m)}
                    disabled={!onFix || anyFixing}
                    className="group flex w-full items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-2.5 py-2 text-left text-xs text-amber-500/90 transition-colors hover:border-amber-400/50 hover:bg-amber-500/10 disabled:opacity-60"
                  >
                    {isFixing ? <Loader2 className="h-3.5 w-3.5 mt-0.5 shrink-0 animate-spin text-amber-400" /> : <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />}
                    <span className="flex-1">{m}</span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300 opacity-80 group-hover:opacity-100 shrink-0">
                      <Wand2 className="h-3 w-3" /> {isFixing ? 'Arreglando…' : 'Arreglar'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : data ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Post optimizado para guardados</div>
      ) : null}
    </div>
  )
}
