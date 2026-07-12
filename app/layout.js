import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'ViralForge — Motor de Ingeniería Viral para X',
  description:
    'Analiza tweets virales por perfil o temática y genera versiones optimizadas con IA (Gemini 2.5 Flash).',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-background text-foreground antialiased">
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  )
}
