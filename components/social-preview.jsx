'use client'

import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { BadgeCheck, MessageCircle, Repeat2, Heart, BarChart2, Bookmark, Share } from 'lucide-react'

function formatNum(n) {
  if (n === null || n === undefined) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

// Mockup fiel del feed nativo de X (modo oscuro)
export default function SocialPreview({
  name = 'Z.META',
  handle = 'MorrrMorrr63705',
  avatar = '',
  verified = true,
  text = '',
  stats = { replies: 128, retweets: 342, likes: 2870, views: 84200 },
}) {
  const cleanHandle = handle.replace('@', '')
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black p-4 font-[system-ui]">
      <div className="flex gap-3">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarImage src={avatar} />
          <AvatarFallback className="bg-indigo-600 text-sm">{(name?.[0] || 'Z').toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[15px] leading-tight">
            <span className="font-bold text-white truncate">{name}</span>
            {verified && <BadgeCheck className="h-[18px] w-[18px] text-sky-400 shrink-0" />}
            <span className="text-zinc-500 truncate">@{cleanHandle}</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-500">ahora</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-normal text-zinc-100">
            {text || 'Tu tweet aparecerá aquí...'}
          </p>
          <div className="mt-3 flex items-center justify-between max-w-md text-zinc-500">
            <span className="inline-flex items-center gap-1.5 text-[13px] hover:text-sky-400 transition-colors">
              <MessageCircle className="h-[18px] w-[18px]" /> {formatNum(stats.replies)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[13px] hover:text-emerald-400 transition-colors">
              <Repeat2 className="h-[18px] w-[18px]" /> {formatNum(stats.retweets)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[13px] hover:text-rose-400 transition-colors">
              <Heart className="h-[18px] w-[18px]" /> {formatNum(stats.likes)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[13px] hover:text-sky-400 transition-colors">
              <BarChart2 className="h-[18px] w-[18px]" /> {formatNum(stats.views)}
            </span>
            <span className="inline-flex items-center gap-3">
              <Bookmark className="h-[18px] w-[18px] hover:text-sky-400 transition-colors" />
              <Share className="h-[18px] w-[18px] hover:text-sky-400 transition-colors" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
