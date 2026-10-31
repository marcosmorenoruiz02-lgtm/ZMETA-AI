'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import BookmarkMeter from '@/components/bookmark-meter'
import SocialPreview from '@/components/social-preview'
import CopyButton from '@/components/zmeta/copy-button'
import { NICHES, TEXT_FORMATS } from '@/lib/client/copy'
import { AlertTriangle, CalendarClock, Link2, Loader2, Sparkles } from 'lucide-react'

export default function ComposePanel({ studio }) {
  const {
    composeText, setComposeText, cluster, setCluster, composeReply, setComposeReply, bmScore, bmLoading, bmFixing,
    composeScheduling, expressTopic, setExpressTopic, myHandle, composeUrls, moveLinkToReply, fixMissing,
    scheduleCompose, runTemplate, loading,
  } = studio

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Escribe tu post</h1>
        <p className="mt-1 text-sm text-muted-foreground">Mientras escribes, te decimos si la gente lo guardaría y cómo subirlo de nivel.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Tu nicho</label>
        <Input value={cluster} onChange={(e) => setCluster(e.target.value)} placeholder="Fitness, cocina, fotografía…" className="h-11" />
        <div className="mt-2 flex flex-wrap gap-2">
          {NICHES.map((niche) => (
            <button key={niche.value} type="button" onClick={() => setCluster(niche.label)} className={`rounded-full border px-3 py-1 text-xs ${cluster === niche.label ? 'border-primary bg-primary/10' : 'border-border text-muted-foreground'}`}>{niche.label}</button>
          ))}
        </div>
      </div>

      <div>
        <Textarea value={composeText} onChange={(e) => setComposeText(e.target.value)} placeholder="Escribe aquí el tweet…" rows={6} className="resize-none text-base" />
        <p className={`mt-1 text-right text-xs ${composeText.length > 280 ? 'text-amber-500' : 'text-muted-foreground'}`}>
          {composeText.length}/280{composeText.length > 280 ? ' · mejor como hilo' : ''}
        </p>
      </div>

      {composeUrls.length > 0 && (
        <Alert>
          <Link2 className="h-4 w-4" />
          <AlertTitle>Hay un enlace en el texto</AlertTitle>
          <AlertDescription>
            En X, los enlaces suelen restar alcance. Muévelo a la primera respuesta.
            <Button size="sm" variant="secondary" onClick={moveLinkToReply} className="mt-2 w-full">Mover el enlace</Button>
          </AlertDescription>
        </Alert>
      )}

      {composeReply && (
        <div className="flex items-center justify-between rounded-xl border bg-secondary/40 px-3 py-2 text-sm">
          <span className="truncate">Primera respuesta lista</span>
          <button type="button" className="text-xs text-muted-foreground" onClick={() => setComposeReply('')}>Quitar</button>
        </div>
      )}

      <BookmarkMeter data={bmScore} loading={bmLoading} onFix={fixMissing} fixing={bmFixing} />

      {composeText.trim() && bmScore && !bmScore?.cta?.present && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falta una pregunta o una invitación</AlertTitle>
          <AlertDescription>Las respuestas en los primeros minutos ayudan. Prueba: {bmScore?.cta?.suggestion}</AlertDescription>
        </Alert>
      )}

      {composeText.trim() && (
        <SocialPreview name="Tú" handle={myHandle || 'tu_usuario'} verified={false} text={composeText} firstReply={composeReply} stats={{ replies: 0, retweets: 0, likes: 0, views: 0 }} />
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" onClick={scheduleCompose} disabled={composeScheduling || !composeText.trim()} className="flex-1">
          {composeScheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
          Guardar para después
        </Button>
        <CopyButton text={composeReply ? `${composeText}\n\n${composeReply}` : composeText} label="Copiar post" className="flex-1" />
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold">¿No sabes por dónde empezar?</h2>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">Dinos el tema y elige un formato. Te escribimos 3 versiones.</p>
        <Input value={expressTopic} onChange={(e) => setExpressTopic(e.target.value)} placeholder="Por ejemplo, productividad con IA" className="mb-3 h-11" />
        <div className="grid gap-2">
          {TEXT_FORMATS.map((format) => (
            <button key={format.key} type="button" disabled={loading} onClick={() => runTemplate(format.key)} className="flex items-center gap-3 rounded-xl border px-3 py-3 text-left hover:bg-secondary/50 disabled:opacity-60">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>
                <span className="block text-sm font-medium">{format.label}</span>
                <span className="block text-xs text-muted-foreground">{format.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
