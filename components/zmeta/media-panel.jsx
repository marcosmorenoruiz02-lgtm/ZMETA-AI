'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import MediaUploader from '@/components/media-uploader'
import { Download, Loader2, Sparkles } from 'lucide-react'

export default function MediaPanel({ studio }) {
  const { igUrl, setIgUrl, igLoading, igResult, extractInstagram, sendInstagramToViral, runVision, loading } = studio
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pasa de un vídeo a un tweet</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pega un Reel o sube un archivo. Leemos lo que se ve y lo que se dice, y escribimos 3 posts.</p>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Enlace de Instagram</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={igUrl} onChange={(e) => setIgUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && extractInstagram()} placeholder="https://www.instagram.com/reel/…" className="h-11" />
          <Button onClick={extractInstagram} disabled={igLoading} className="h-11 shrink-0">
            {igLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Traer vídeo'}
          </Button>
        </div>
        {igResult?.mp4Url && (
          <div className="space-y-3">
            <video src={igResult.mp4Url} poster={igResult.thumbnail} controls className="max-h-64 w-full rounded-xl bg-black object-contain" />
            {igResult.caption && <p className="text-sm text-muted-foreground line-clamp-3">{igResult.caption}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <a href={`/api/instagram/proxy?url=${encodeURIComponent(igResult.mp4Url)}`} className="flex-1">
                <Button variant="secondary" className="w-full"><Download className="mr-2 h-4 w-4" /> Descargar</Button>
              </a>
              <Button onClick={sendInstagramToViral} disabled={loading} className="flex-1">
                <Sparkles className="mr-2 h-4 w-4" /> Convertir en tweets
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="relative py-1 text-center text-xs text-muted-foreground">
        <span className="bg-background px-2 relative z-10">o sube un archivo</span>
        <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
      </div>

      <MediaUploader onGenerate={runVision} loading={loading} />
    </section>
  )
}
