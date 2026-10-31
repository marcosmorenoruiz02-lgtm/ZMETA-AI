'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Activity, TrendingUp, Loader2, Trash2, BarChart3, Eye, PlayCircle, Bookmark, AlertCircle, Info, Gauge, Link2, Download } from 'lucide-react'

const CLS = {
  LOW: { label: 'Bajo rendimiento', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  NORMAL: { label: 'Normal', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  ABOVE_AVERAGE: { label: 'Sobre la media', cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  HIGH: { label: 'Alto rendimiento', cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  OUTLIER: { label: 'Outlier / Viral', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
}

const FIELDS = [
  { k: 'impressions', label: 'Impresiones *', ph: '52149' },
  { k: 'followers', label: 'Seguidores', ph: '2000' },
  { k: 'videoViews', label: 'Reproducciones', ph: '36989' },
  { k: 'uniqueVideoViews', label: 'Reprod. únicas', ph: '30384' },
  { k: 'retention', label: 'Retención vídeo %', ph: '42' },
  { k: 'interactions', label: 'Interacciones (total)', ph: '1386' },
  { k: 'likes', label: 'Me gusta', ph: '' },
  { k: 'reposts', label: 'Reposts', ph: '' },
  { k: 'replies', label: 'Respuestas', ph: '' },
  { k: 'quotes', label: 'Citas', ph: '' },
  { k: 'bookmarks', label: 'Guardados', ph: '' },
  { k: 'detailExpands', label: 'Ampliaciones', ph: '235' },
  { k: 'profileVisits', label: 'Visitas perfil', ph: '65' },
]

function Stat({ label, value, suffix = '' }) {
  return (
    <div className="rounded-lg border border-border/50 bg-secondary/20 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value ?? 'n/d'}{value != null && suffix}</div>
    </div>
  )
}

export default function PerformancePanel({ onCountChange }) {
  const [form, setForm] = useState({})
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState([])
  const [distribution, setDistribution] = useState(null)
  const [report, setReport] = useState(null)

  const load = async () => {
    try {
      const res = await fetch('/api/performance')
      const j = await res.json()
      if (res.ok) { setItems(j.items || []); setDistribution(j.distribution || null); onCountChange && onCountChange((j.items || []).length) }
    } catch (e) {}
  }
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const extract = async () => {
    if (!url.trim()) { toast.error('Pega la URL de la publicación'); return }
    setExtracting(true)
    try {
      const res = await fetch('/api/performance/from-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      const j = await res.json()
      if (!res.ok) { toast.error(j?.error || 'No se pudo extraer'); return }
      setForm((p) => ({ ...p, ...j.prefill }))
      if (j.prefill?.text) setText(j.prefill.text)
      toast.success('Métricas públicas extraídas de X', { description: j.note })
    } catch (e) { toast.error('Error al extraer de X') } finally { setExtracting(false) }
  }

  const submit = async () => {
    if (!form.impressions || Number(form.impressions) <= 0) { toast.error('Las impresiones son obligatorias'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/performance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, text }) })
      const j = await res.json()
      if (!res.ok) { toast.error(j?.error || 'No se pudo guardar'); return }
      setItems(j.items || []); setDistribution(j.distribution || null); setReport(j.report || null)
      onCountChange && onCountChange((j.items || []).length)
      toast.success('Métricas guardadas')
    } catch (e) { toast.error('Error al guardar métricas') } finally { setSaving(false) }
  }

  const del = async (id) => {
    try {
      const res = await fetch(`/api/performance?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const j = await res.json()
      if (res.ok) { setItems(j.items || []); setDistribution(j.distribution || null); onCountChange && onCountChange((j.items || []).length); toast.success('Eliminado') }
    } catch (e) { toast.error('No se pudo eliminar') }
  }

  const confLabel = (c) => c >= 0.7 ? 'Confianza alta' : c >= 0.5 ? 'Confianza media' : 'Confianza baja'
  const rec = report ? items.find((r) => r.classification === report.classification) : null

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">Métricas reales de tu publicación</span></div>
        <p className="text-[11px] text-muted-foreground mb-3">Introduce las analíticas de X Analytics (privadas del autor). Los cálculos y la clasificación se hacen en el servidor.</p>
        <div className="mb-3 rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-2.5">
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-cyan-400 mb-1.5"><Link2 className="h-3.5 w-3.5" /> Extraer de una URL de X (autocompleta lo público)</label>
          <div className="flex gap-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://x.com/usuario/status/123..." className="h-9 bg-background/50 text-sm" />
            <Button size="sm" onClick={extract} disabled={extracting} className="h-9 bg-cyan-600 hover:bg-cyan-500 text-black shrink-0">
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-1" /> Extraer</>}
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">Impresiones = visualizaciones públicas. Reproducciones de vídeo y retención son privadas → añádelas a mano si las tienes.</p>
        </div>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Texto del post (opcional, para contexto)" className="mb-3 bg-background/50 h-9 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map((f) => (
            <div key={f.k}>
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.label}</label>
              <Input type="number" inputMode="numeric" value={form[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)} placeholder={f.ph} className="h-9 bg-background/50 text-sm" />
            </div>
          ))}
        </div>
        <Button onClick={submit} disabled={saving} className="mt-3 w-full glow-primary">
          {saving ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Analizando…</>) : (<><Gauge className="h-4 w-4 mr-1.5" /> Registrar y analizar rendimiento</>)}
        </Button>
      </div>

      {report && rec && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-primary" /> Informe de rendimiento</span>
            <Badge className={`border ${CLS[report.classification]?.cls}`}>{CLS[report.classification]?.label}</Badge>
          </div>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-3xl font-bold tabular-nums bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{rec.performanceScore}</span>
            <span className="text-xs text-muted-foreground mb-1">/100 · percentil {report.percentile}</span>
          </div>
          <Progress value={rec.performanceScore} className="h-2 mb-3" />
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Stat label="Engagement" value={rec.derived.engagementRate} suffix="%" />
            <Stat label="Reproducciones" value={rec.derived.videoViewRate} suffix="%" />
            <Stat label="Imp./seguidor" value={rec.derived.impressionsPerFollower} suffix="x" />
          </div>
          <div className="space-y-1.5 mb-2">
            {report.observations.map((o, i) => (<p key={i} className="flex items-start gap-1.5 text-xs text-foreground/80"><Eye className="h-3.5 w-3.5 mt-0.5 shrink-0 text-cyan-400" /> {o}</p>))}
            {report.comparison.map((o, i) => (<p key={i} className="flex items-start gap-1.5 text-xs text-foreground/80"><TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0 text-violet-400" /> {o}</p>))}
          </div>
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5 mb-2">
            <div className="flex items-center justify-between mb-1"><span className="text-[10px] uppercase tracking-wide text-amber-400 font-mono">Hipótesis (asociación)</span><span className="text-[10px] text-amber-400/80">{confLabel(report.confidence)}</span></div>
            {report.hypotheses.map((h, i) => (<p key={i} className="text-xs text-amber-500/90">• {h}</p>))}
          </div>
          <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground"><Info className="h-3 w-3 mt-0.5 shrink-0" /> {report.disclaimer}</p>
        </div>
      )}

      {distribution && distribution.count > 0 && (
        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Tus posts medidos ({distribution.count})</span>
            <span className="text-[10px] text-muted-foreground">Score medio {distribution.avgScore} · base {distribution.basis === 'relative' ? 'relativa' : 'absoluta'}</span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {items.map((r) => (
              <div key={r.id} className="rounded-lg border border-border/50 bg-background/40 p-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge className={`border text-[10px] ${CLS[r.classification]?.cls}`}>{CLS[r.classification]?.label}</Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tabular-nums text-primary">{r.performanceScore}</span>
                    <button onClick={() => del(r.id)} className="text-rose-400 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {r.text ? <p className="text-xs text-foreground/70 line-clamp-2 mb-1">{r.text}</p> : null}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {Number(r.metrics.impressions).toLocaleString('es')}</span>
                  <span className="inline-flex items-center gap-1"><Activity className="h-3 w-3" /> {r.derived.engagementRate ?? 'n/d'}%</span>
                  {r.metrics.videoViews > 0 ? <span className="inline-flex items-center gap-1"><PlayCircle className="h-3 w-3" /> {r.derived.videoViewRate}%</span> : null}
                  {r.metrics.bookmarks > 0 ? <span className="inline-flex items-center gap-1"><Bookmark className="h-3 w-3" /> {Number(r.metrics.bookmarks).toLocaleString('es')}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!distribution || distribution.count === 0) && !report && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground justify-center py-6"><AlertCircle className="h-4 w-4" /> Registra tu primer post para empezar a aprender de tu cuenta.</p>
      )}
    </div>
  )
}
