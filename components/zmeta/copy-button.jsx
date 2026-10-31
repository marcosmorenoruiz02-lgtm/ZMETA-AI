'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function CopyButton({ text, label = 'Copiar', className = '' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('No se pudo copiar')
    }
  }
  return (
    <Button size="sm" variant={copied ? 'default' : 'secondary'} onClick={handleCopy} className={className}>
      {copied ? <><Check className="h-4 w-4 mr-1.5" /> Copiado</> : <><Copy className="h-4 w-4 mr-1.5" /> {label}</>}
    </Button>
  )
}
