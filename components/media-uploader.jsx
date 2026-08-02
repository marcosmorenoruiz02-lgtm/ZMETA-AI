'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { UploadCloud, X, Sparkles, Loader2, Film, Image as ImageIcon, Music } from 'lucide-react'

const MAX_MEDIA = 24 * 1024 * 1024 // 24MB (límite Whisper 25MB)

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// Extrae varios keyframes representativos del video en el cliente (sin ffmpeg)
function extractFrames(url, count = 5) {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.crossOrigin = 'anonymous'
    v.src = url
    const frames = []
    let targets = []
    let idx = 0
    const grab = (time) => { try { v.currentTime = time } catch (e) { finish() } }
    const finish = () => resolve(frames.length ? frames : [])
    v.onloadeddata = () => {
      const dur = v.duration && isFinite(v.duration) ? v.duration : 2
      // muestrea puntos representativos a lo largo del clip (evita el frame 0 y el último exacto)
      const n = Math.max(1, Math.min(count, Math.round(dur >= 3 ? count : 2)))
      targets = Array.from({ length: n }, (_, i) => Math.min(dur - 0.05, (dur * (i + 1)) / (n + 1)))
      grab(targets[0])
    }
    v.onseeked = () => {
      try {
        const c = document.createElement('canvas')
        c.width = v.videoWidth || 640
        c.height = v.videoHeight || 360
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
        frames.push(c.toDataURL('image/jpeg', 0.82))
      } catch (e) {}
      idx += 1
      if (idx < targets.length) grab(targets[idx])
      else finish()
    }
    v.onerror = () => finish()
    // salvaguarda de tiempo
    setTimeout(() => finish(), 8000)
  })
}

export default function MediaUploader({ onGenerate, loading }) {
  const [preview, setPreview] = useState(null)
  const [image, setImage] = useState(null)
  const [frames, setFrames] = useState([])
  const [media, setMedia] = useState(null)
  const [mediaType, setMediaType] = useState(null)
  const [note, setNote] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      if (file.type.startsWith('image/')) {
        const dataUrl = await readAsDataURL(file)
        setImage(dataUrl); setFrames([dataUrl]); setMedia(null); setMediaType('image')
        setPreview({ url: dataUrl, type: 'image' })
      } else if (file.type.startsWith('video/')) {
        const objUrl = URL.createObjectURL(file)
        const kf = await extractFrames(objUrl, 5)
        const full = file.size <= MAX_MEDIA ? await readAsDataURL(file) : null
        setImage(kf[0] || null); setFrames(kf); setMedia(full); setMediaType('video')
        setPreview({ url: objUrl, type: 'video', poster: kf[0] || null, tooBig: !full, frameCount: kf.length })
      } else if (file.type.startsWith('audio/')) {
        const objUrl = URL.createObjectURL(file)
        const full = file.size <= MAX_MEDIA ? await readAsDataURL(file) : null
        setImage(null); setFrames([]); setMedia(full); setMediaType('audio')
        setPreview({ url: objUrl, type: 'audio', tooBig: !full })
      } else {
        alert('Formato no soportado. Usa imagen (.png/.jpg/.webp), video (.mp4/.mov) o audio (.mp3/.wav).')
      }
    } catch (e) {
      console.error(e)
      alert('No se pudo procesar el archivo.')
    } finally {
      setBusy(false)
    }
  }

  const clear = () => { setPreview(null); setImage(null); setFrames([]); setMedia(null); setMediaType(null) }
  const canGenerate = !!image || !!media || frames.length > 0

  return (
    <div>
      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 py-12 px-6 text-center ${dragOver ? 'border-primary bg-primary/5 shadow-[0_0_24px_hsl(var(--glow)/0.25)]' : 'border-border hover:border-primary/50 bg-secondary/20'}`}
        >
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/quicktime,video/*,audio/mpeg,audio/wav,audio/mp3,audio/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-[0_0_24px_hsl(var(--glow)/0.4)]">
            {busy ? <Loader2 className="h-7 w-7 text-primary-foreground animate-spin" /> : <UploadCloud className="h-7 w-7 text-primary-foreground" />}
          </div>
          <p className="text-sm font-medium text-foreground">Arrastra imagen, video o audio, o haz clic para subir</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3 justify-center flex-wrap">
            <span className="inline-flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> PNG · JPG · WEBP</span>
            <span className="inline-flex items-center gap-1"><Film className="h-3.5 w-3.5" /> MP4 · MOV</span>
            <span className="inline-flex items-center gap-1"><Music className="h-3.5 w-3.5" /> MP3 · WAV</span>
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-2">El audio de videos/clips se transcribe automáticamente (Whisper)</p>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-border">
          {preview.type === 'image' && <img src={preview.url} alt="preview" className="w-full max-h-72 object-contain bg-black" />}
          {preview.type === 'video' && <video src={preview.url} poster={preview.poster} controls className="w-full max-h-72 object-contain bg-black" />}
          {preview.type === 'audio' && (
            <div className="flex flex-col items-center gap-3 bg-secondary/40 py-8 px-4">
              <span className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"><Music className="h-6 w-6 text-primary-foreground" /></span>
              <audio src={preview.url} controls className="w-full max-w-sm" />
            </div>
          )}
          <button onClick={clear} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-black/80"><X className="h-4 w-4" /></button>
          {preview.type === 'video' && (<div className="absolute bottom-2 left-2 text-[10px] px-2 py-1 rounded-md bg-black/60 text-white">{preview.frameCount > 1 ? `${preview.frameCount} keyframes + audio analizados` : 'Fotograma + audio analizados'}</div>)}
          {preview.tooBig && (<div className="absolute bottom-2 right-2 text-[10px] px-2 py-1 rounded-md bg-amber-600/80 text-white">Audio &gt;24MB: no se transcribirá</div>)}
        </div>
      )}

      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contexto opcional (ej. tono, producto, objetivo del post)" className="mt-3 w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60 transition-colors" />

      <Button onClick={() => canGenerate && onGenerate({ image, frames, media, mediaType, preview, note })} disabled={!canGenerate || busy || loading} className="mt-3 w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
        {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analizando media...</>) : (<><Sparkles className="h-4 w-4 mr-2" /> Generar post desde la media</>)}
      </Button>
    </div>
  )
}
