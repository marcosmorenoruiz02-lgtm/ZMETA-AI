'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { BarChart3, CalendarClock, Clapperboard, Clock, Download, History, Loader2, Moon, PenLine, RotateCcw, Search, Sparkles, Star, Sun, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import PerformancePanel from '@/components/performance-panel'
import AnalyzePanel from '@/components/zmeta/analyze-panel'
import ComposePanel from '@/components/zmeta/compose-panel'
import MediaPanel from '@/components/zmeta/media-panel'
import ResultsPanel from '@/components/zmeta/results-panel'
import CopyButton from '@/components/zmeta/copy-button'
import { useStudio } from '@/components/zmeta/use-studio'

const NAV = [
  { id: 'analizar', label: 'Analizar', icon: Search },
  { id: 'escribir', label: 'Escribir', icon: PenLine },
  { id: 'video', label: 'Vídeo', icon: Clapperboard },
  { id: 'medir', label: 'Medir', icon: BarChart3 },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-9 w-9" />
  const dark = theme !== 'light'
  return (
    <button type="button" onClick={() => setTheme(dark ? 'light' : 'dark')} className="flex h-9 w-9 items-center justify-center rounded-xl border" aria-label={dark ? 'Usar tema claro' : 'Usar tema oscuro'}>
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export default function AppShell() {
  const studio = useStudio()
  const { section, setSection, metrics, scheduledCount, scheduleOpen, openSchedule, scheduledItems, loadingSchedule, deleteScheduled, historyOpen, setHistoryOpen, historySearch, setHistorySearch, filteredHistory, reloadRun, togglePin, exportRun, myHandle, saveHandle, tip, setTip } = studio

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none">ZMETA</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Tweets con más alcance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="hidden md:block lg:hidden">
            <span className="sr-only">Tu usuario de X</span>
            <input value={myHandle} onChange={(e) => saveHandle(e.target.value)} placeholder="@tu_usuario" className="h-9 w-36 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary" />
          </label>
          <div className="hidden items-center gap-1 rounded-lg border px-2.5 py-1 text-xs sm:flex" title="Tiempo estimado que te has ahorrado">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>{metrics.hours_saved} h ahorradas</span>
          </div>
          <Sheet open={scheduleOpen} onOpenChange={openSchedule}>
            <SheetTrigger asChild>
              <button type="button" className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs" title="Cola de publicaciones">
                <CalendarClock className="h-3.5 w-3.5" /> {scheduledCount}
              </button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Para publicar después</SheetTitle>
                <SheetDescription>Copia un borrador cuando quieras publicarlo, o quítalo de la cola.</SheetDescription>
              </SheetHeader>
              <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
                {loadingSchedule && <p className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Cargando…</p>}
                {!loadingSchedule && scheduledItems.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Todavía no has guardado ninguno.</p>}
                {scheduledItems.map((item) => (
                  <div key={item.id} className="rounded-xl border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>{new Date(item.scheduledAt).toLocaleString('es')}</span>
                      {item.style ? <Badge variant="secondary">{item.style}</Badge> : null}
                    </div>
                    <p className="line-clamp-6 whitespace-pre-wrap text-sm">{item.text}</p>
                    <div className="mt-2 flex gap-2">
                      <CopyButton text={item.text} />
                      <Button size="sm" variant="secondary" onClick={() => deleteScheduled(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="secondary"><History className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Historial</span></Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Historial</SheetTitle>
                <SheetDescription>Vuelve a una generación anterior sin volver a llamar a la IA.</SheetDescription>
              </SheetHeader>
              <Input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Buscar…" className="mt-4" />
              <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
                {filteredHistory.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay nada guardado en este navegador.</p>}
                {filteredHistory.map((item) => (
                  <div key={item.hash} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleString('es')}</p>
                      </div>
                      <button type="button" onClick={() => togglePin(item.hash)} aria-label="Fijar"><Star className={`h-4 w-4 ${item.pinned ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} /></button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="secondary" className="flex-1" onClick={() => reloadRun(item)}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Abrir</Button>
                      <Button size="sm" variant="secondary" onClick={() => exportRun(item)} aria-label="Exportar"><Download className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <ThemeToggle />
        </div>
      </header>

      {tip && (
        <div className="border-b bg-secondary/40">
          <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{tip.title}</p>
              <p className="text-xs text-muted-foreground">{tip.message}</p>
            </div>
            <button type="button" onClick={() => setTip(null)} aria-label="Cerrar aviso" className="text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-6xl">
        <nav className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 flex-col gap-1 border-r p-3 lg:flex">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = section === item.id
            return (
              <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm ${active ? 'bg-primary/10 font-medium text-foreground' : 'text-muted-foreground hover:bg-secondary/60'}`}>
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            )
          })}
          <div className="mt-auto rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
            Tu usuario en la vista previa
            <input value={myHandle} onChange={(e) => saveHandle(e.target.value)} placeholder="@tu_usuario" className="mt-2 h-9 w-full rounded-lg border bg-background px-2 text-sm text-foreground outline-none" />
          </div>
        </nav>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          {section === 'medir' ? (
            <div className="mx-auto max-w-3xl space-y-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Cómo están rindiendo</h1>
                <p className="mt-1 text-sm text-muted-foreground">Pega un enlace o anota las cifras de una publicación. Comparamos con el resto de tu cuenta.</p>
              </div>
              <PerformancePanel />
            </div>
          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-2">
              <div>
                {section === 'analizar' && <AnalyzePanel studio={studio} />}
                {section === 'escribir' && <ComposePanel studio={studio} />}
                {section === 'video' && <MediaPanel studio={studio} />}
              </div>
              <ResultsPanel studio={studio} />
            </div>
          )}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-background/95 backdrop-blur lg:hidden">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = section === item.id
          return (
            <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
