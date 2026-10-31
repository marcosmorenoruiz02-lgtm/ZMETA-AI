'use client'

export default function ScoreRing({ value = 0, label = 'gancho', size = 72 }) {
  const stroke = 7
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const offset = c - (pct / 100) * c
  const color = pct >= 85 ? '#0891b2' : pct >= 65 ? '#0284c7' : pct >= 45 ? '#d97706' : '#e11d48'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border))" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-semibold" style={{ color }}>{pct}</span>
        <span className="text-[9px] text-muted-foreground -mt-0.5">{label}</span>
      </div>
    </div>
  )
}
