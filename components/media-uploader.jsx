'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { UploadCloud, X, Sparkles, Loader2, Film, Image as ImageIcon } from 'lucide-react'

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// Extrae un fotograma representativo del video en el cliente (sin ffmpeg)
function extractFrame(url) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.src = url
    v.onloadeddata = () => {
      try { v.currentTime = Math.min(1.5, (v.duration || 2) / 2) } catch (e) { resolve(null) }
    }
    v.onseeked = () => {
      try {
        const c = document.createElement('canvas')
        c.width = v.videoWidth || 640
        c.height = v.videoHeight || 360
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.85))
      } catch (e) { reject(e) }
    }
    v.onerror = reject
  })
}

export default function MediaUploader({ onGenerate, loading }) {
  const [preview, setPreview] = useState(null)
  const [image, setImage] = useState(null)
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
        setImage(dataUrl)
        setPreview({ url: dataUrl, type: 'image' })
      } else if (file.type.startsWith('video/')) {
        const objUrl = URL.createObjectURL(file)
        const frame = await extractFrame(objUrl)
        setImage(frame)
        setPreview({ url: objUrl, type: 'video', poster: frame })
      } else {
        alert('Formato no soportado. Usa imagen (.png/.jpg/.webp) o video (.mp4/.mov).')
      }
    } catch (e) {
      console.error(e)
      alert('No se pudo procesar el archivo.')
    } finally {
      setBusy(false)
    }
  }

  const clear = () => { setPreview(null); setImage(null) }

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
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/quicktime,video/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-[0_0_24px_hsl(var(--glow)/0.4)]">
            {busy ? <Loader2 className="h-7 w-7 text-primary-foreground animate-spin" /> : <UploadCloud className="h-7 w-7 text-primary-foreground" />}
          </div>
          <p className="text-sm font-medium text-foreground">Arrastra una imagen o video, o haz clic para subir</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3 justify-center">
            <span className="inline-flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> PNG · JPG · WEBP</span>
            <span className="inline-flex items-center gap-1"><Film className="h-3.5 w-3.5" /> MP4 · MOV</span>
          </p>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-border">
          {preview.type === 'image' ? (
            <img src={preview.url} alt="preview" className="w-full max-h-72 object-contain bg-black" />
          ) : (
            <video src={preview.url} poster={preview.poster} controls className="w-full max-h-72 object-contain bg-black" />
          )}
          <button onClick={clear} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-black/80">
            <X className="h-4 w-4" />
          </button>
          {preview.type === 'video' && (
            <div className="absolute bottom-2 left-2 text-[10px] px-2 py-1 rounded-md bg-black/60 text-white">Fotograma analizado automáticamente</div>
          )}
        </div>
      )}

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Contexto opcional (ej. tono, producto, objetivo del post)"
        className="mt-3 w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60 transition-colors"
      />

      <Button
        onClick={() => image && onGenerate({ image, preview, note })}
        disabled={!image || busy || loading}
        className="mt-3 w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
      >
        {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analizando media...</>) : (<><Sparkles className="h-4 w-4 mr-2" /> Generar post desde la media</>)}
      </Button>
    </div>
  )
}
