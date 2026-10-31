'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import SocialPreview from '@/components/social-preview'
import CopyButton from '@/components/zmeta/copy-button'
import ScoreRing from '@/components/zmeta/score-ring'
import { PERSONALITY_LABELS, formatNum } from '@/lib/client/copy'
import { AlertTriangle, BadgeCheck, CalendarClock, ExternalLink, Eye, Heart, Loader2, MessageCircle, Repeat2, Sparkles, Wand2 } from 'lucide-react'

function retentionClass(level) {
  if (level === 'Alta') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
  if (level === 'Media') return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
  return 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
}

function TweetCard({ tweet, index, studio }) {
  const { rewriting, scheduling, rewriteTweet, scheduleDraft, myHandle, data, resultMedia } = studio
  const isThread = Array.isArray(tweet.thread) && tweet.thread.length > 1
  const copyText = isThread ? tweet.thread.join('\n\n') : tweet.text
  const busy = rewriting === index
  const sched = scheduling === index
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{tweet.style || `Propuesta ${index + 1}`}</p>
          <div className="flex flex-wrap gap-1.5">
            {typeof tweet.voiceScore === 'number' && <Badge variant="secondary">Voz {tweet.voiceScore}</Badge>}
            {typeof tweet.viralPotentialScore === 'number' && <Badge variant="secondary">Potencial {tweet.viralPotentialScore}</Badge>}
            {tweet.rewritten && <Badge variant="secondary">Reescrito</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-secondary/40 p-3">
          <ScoreRing value={tweet.hookStrength || 0} />
          <div>
            <p className="text-xs text-muted-foreground">Probabilidad de que enganche</p>
            <Badge className={`mt-1 border-0 ${retentionClass(tweet.retention)}`}>Retención {tweet.retention || 'N/A'}</Badge>
            <p className={`mt-1 text-xs ${(tweet.text || '').length > 280 ? 'text-rose-500' : 'text-muted-foreground'}`}>{(tweet.text || '').length}/280</p>
          </div>
        </div>
        {isThread ? (
          <div className="space-y-2">
            {tweet.thread.map((part, i) => (
              <div key={i} className="rounded-lg border-l-2 border-primary/40 bg-secondary/30 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{i + 1}/{tweet.thread.length}</p>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{part}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{tweet.text}</p>
        )}
        {tweet.weakPoint && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Se puede mejorar</AlertTitle>
            <AlertDescription>
              {tweet.weakPoint}
              <Button size="sm" className="mt-2 w-full" onClick={() => rewriteTweet(index)} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Reescribir este tweet
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {tweet.rationale && <p className="text-xs text-muted-foreground"><span className="text-foreground">Por qué funciona: </span>{tweet.rationale}</p>}
        {tweet.firstSelfReply && (
          <div className="rounded-xl border bg-secondary/30 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-xs font-medium">Publícalo justo debajo</p>
              <CopyButton text={tweet.firstSelfReply} label="Copiar respuesta" />
            </div>
            <p className="text-sm">{tweet.firstSelfReply}</p>
          </div>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground">Ver cómo quedaría en X</summary>
          <div className="mt-2">
            <SocialPreview
              name={data?.userInfo?.name || 'Tú'}
              handle={myHandle || data?.userInfo?.userName || 'tu_usuario'}
              avatar={data?.userInfo?.profilePicture}
              verified={!!data?.userInfo?.isBlueVerified}
              text={isThread ? tweet.thread[0] : tweet.text}
              media={resultMedia}
              stats={{ replies: 0, retweets: 0, likes: 0, views: 0 }}
            />
          </div>
        </details>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button size="sm" variant="secondary" onClick={() => scheduleDraft(index)} disabled={sched}>
            {sched ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
            Guardar
          </Button>
          <CopyButton text={copyText} label="Copiar tweet" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function ResultsPanel({ studio }) {
  const { data, tweets, loading, loadingLabel, error, fromCache, resultsRef } = studio
  const analysis = data?.analysis?.patternAnalysis
  const personality = data?.personality
  const viralDNA = data?.viralDNA
  const growth = data?.growth || data?.analysis?.growth
  const primeTimes = data?.primeTimes || []
  const vision = data?.vision
  const audio = data?.audio

  return (
    <div ref={resultsRef} className="space-y-4 scroll-mt-20">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tus propuestas</h2>
        {fromCache && <Badge variant="secondary">Del historial</Badge>}
      </div>

      {!data && !loading && !error && (
        <div className="rounded-2xl border border-dashed px-6 py-14 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cuando generes, los 3 tweets aparecen aquí. Empieza por un tema que te interese.</p>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border bg-card px-6 py-12 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="font-medium">{loadingLabel || 'Preparando tus tweets…'}</p>
          <p className="mt-1 text-sm text-muted-foreground">Suele tardar un momento. No cierres la página.</p>
        </div>
      )}

      {error && !loading && <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {!loading && tweets.map((tweet, index) => <TweetCard key={index} tweet={tweet} index={index} studio={studio} />)}

      {data && !loading && (
        <Accordion type="multiple" className="rounded-2xl border bg-card px-4">
          {analysis && (
            <AccordionItem value="patrones">
              <AccordionTrigger>Qué está funcionando</AccordionTrigger>
              <AccordionContent>
                <p>{analysis.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {analysis.keyPatterns?.map((pattern, i) => <Badge key={i} variant="secondary">{pattern}</Badge>)}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
          {personality && (
            <AccordionItem value="voz">
              <AccordionTrigger>Voz del autor</AccordionTrigger>
              <AccordionContent>
                {personality.personalidad_global && <p className="mb-2 italic">“{personality.personalidad_global}”</p>}
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(PERSONALITY_LABELS).map(([key, label]) => personality[key] && personality[key] !== 'n/d' ? (
                    <Badge key={key} variant="secondary">{label}: {personality[key]}</Badge>
                  ) : null)}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
          {viralDNA?.available && (
            <AccordionItem value="adn">
              <AccordionTrigger>Patrones de los posts que mejor van</AccordionTrigger>
              <AccordionContent className="space-y-2">
                {viralDNA.patterns?.length ? viralDNA.patterns.map((p, i) => (
                  <p key={i} className="text-sm">{p.description}</p>
                )) : <p>Todavía no hay un patrón claro.</p>}
                <p className="text-xs text-muted-foreground">{viralDNA.disclaimer}</p>
              </AccordionContent>
            </AccordionItem>
          )}
          {growth && (
            <AccordionItem value="crecimiento">
              <AccordionTrigger>Textos para el vídeo y los comentarios</AccordionTrigger>
              <AccordionContent className="space-y-3">
                {growth.topBanners?.map((banner, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                    <span className="text-sm font-semibold uppercase">{banner}</span>
                    <CopyButton text={banner} label="Copiar" />
                  </div>
                ))}
                {growth.loopOutro && <p className="text-sm"><span className="font-medium">Cierre en bucle: </span>{growth.loopOutro}</p>}
                {growth.replyStrategy && <p className="text-sm"><span className="font-medium">Respuestas: </span>{growth.replyStrategy}</p>}
              </AccordionContent>
            </AccordionItem>
          )}
          {(vision || audio) && (
            <AccordionItem value="media">
              <AccordionTrigger>Qué vimos en el archivo</AccordionTrigger>
              <AccordionContent className="space-y-2">
                {vision?.description && <p>{vision.description}</p>}
                {vision?.ocr && <p className="whitespace-pre-wrap rounded-lg bg-secondary/50 p-2 text-xs">Texto en imagen: {vision.ocr}</p>}
                {audio?.transcript && <p className="whitespace-pre-wrap rounded-lg bg-secondary/50 p-2 text-xs">Audio: {audio.transcript}</p>}
                {data.combined_hook_angle && <p className="text-sm">Ángulo: {data.combined_hook_angle}</p>}
              </AccordionContent>
            </AccordionItem>
          )}
          {data.originalTweets?.length > 0 && (
            <AccordionItem value="fuentes">
              <AccordionTrigger>Tweets que usamos de referencia</AccordionTrigger>
              <AccordionContent className="space-y-3">
                {data.userInfo && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{data.userInfo.name}</span>
                    {data.userInfo.isBlueVerified && <BadgeCheck className="h-4 w-4 text-sky-500" />}
                    <span className="text-muted-foreground">@{data.userInfo.userName} · {formatNum(data.userInfo.followers)} seguidores</span>
                  </div>
                )}
                {data.originalTweets.map((tweet, index) => (
                  <div key={tweet.id || index} className="rounded-lg border p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{tweet.author?.userName ? `@${tweet.author.userName}` : 'X'}</span>
                      {tweet.url && <a href={tweet.url} target="_blank" rel="noreferrer" className="hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>}
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{tweet.text}</p>
                    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{formatNum(tweet.likes)}</span>
                      <span className="inline-flex items-center gap-1"><Repeat2 className="h-3 w-3" />{formatNum(tweet.retweets)}</span>
                      <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{formatNum(tweet.replies)}</span>
                      <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{formatNum(tweet.views)}</span>
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
          {primeTimes.length > 0 && (
            <AccordionItem value="horarios">
              <AccordionTrigger>Mejores horas para publicar</AccordionTrigger>
              <AccordionContent className="space-y-1">
                {primeTimes.map((slot, i) => (
                  <p key={i} className="text-sm">{slot.window} · {slot.count} tweets</p>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      )}
    </div>
  )
}
