'use client'

import React, { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion, useScroll, useTransform, useMotionValue } from 'framer-motion'
import {
  Sparkles, Globe, Smartphone, ArrowRight, Zap, Boxes, Wand2, GitBranch,
  ShieldCheck, Rocket, Database, Cpu, Play, Star, ChevronRight,
} from 'lucide-react'

const Scene3D = dynamic(() => import('@/components/landing/Scene3D'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#05060a]" />,
})

const EXAMPLES = {
  web: [
    'Build a CRM to track my sales pipeline',
    'Create a SaaS analytics dashboard with charts',
    'Make a marketplace for handmade products',
    'Design a booking system for my clinic',
  ],
  mobile: [
    'Build a fitness tracker with daily streaks',
    'Create a habit app with push reminders',
    'Make a food delivery app with live maps',
    'Design a budgeting app with smart insights',
  ],
}

function useTypewriter(list, speed = 45, pause = 1400) {
  const [text, setText] = useState('')
  const [i, setI] = useState(0)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    const current = list[i % list.length]
    let timeout
    if (!deleting && text === current) {
      timeout = setTimeout(() => setDeleting(true), pause)
    } else if (deleting && text === '') {
      setDeleting(false)
      setI((v) => v + 1)
    } else {
      timeout = setTimeout(() => {
        setText(current.slice(0, deleting ? text.length - 1 : text.length + 1))
      }, deleting ? speed / 2 : speed)
    }
    return () => clearTimeout(timeout)
  }, [text, deleting, i, list, speed, pause])
  // reset when list (mode) changes
  useEffect(() => { setText(''); setDeleting(false); setI(0) }, [list])
  return text
}

const FEATURES = [
  { icon: Wand2, title: 'Prompt to product', desc: 'Describe your idea in plain language. Emergent scaffolds a full-stack app in minutes, not months.', color: '#8b5cf6' },
  { icon: Boxes, title: 'Web & mobile, one flow', desc: 'Switch between a responsive web app and a native-feel mobile app without rewriting a thing.', color: '#22d3ee' },
  { icon: Database, title: 'Backend included', desc: 'Databases, auth, and APIs are wired for you. Your data model just works out of the box.', color: '#f472b6' },
  { icon: GitBranch, title: 'Iterate by chatting', desc: 'Ask for changes and watch them land live. Every edit is versioned and reversible.', color: '#34d399' },
  { icon: ShieldCheck, title: 'Production ready', desc: 'Secure defaults, environment management, and one-click deploy to a live URL.', color: '#f59e0b' },
  { icon: Cpu, title: 'Powered by frontier AI', desc: 'The latest models plan, code, and test your app with agentic precision.', color: '#60a5fa' },
]

const STEPS = [
  { n: '01', title: 'Describe it', desc: 'Type what you want to build and pick Web or Mobile.' },
  { n: '02', title: 'Watch it build', desc: 'The agent designs the UI, writes code, and wires the backend.' },
  { n: '03', title: 'Refine & ship', desc: 'Chat to tweak, then deploy to a live URL in a click.' },
]

function Reveal({ children, delay = 0, y = 28 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default function LandingPage() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const [mode, setMode] = useState('web')
  const [prompt, setPrompt] = useState('')
  const placeholder = useTypewriter(EXAMPLES[mode])

  // hero content parallax
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <div className="relative min-h-screen w-full bg-[#05060a] text-white antialiased overflow-x-hidden selection:bg-violet-500/30">
      {/* ambient gradient glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/4 h-[420px] w-[420px] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[380px] w-[380px] rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-[0_0_28px_rgba(139,92,246,0.6)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Emergent</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#showcase" className="hover:text-white transition-colors">Showcase</a>
          </nav>
          <Link href="/" className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium backdrop-blur-md hover:bg-white/10 transition-colors">
            Launch app <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section ref={heroRef} className="relative h-screen w-full">
        <div className="absolute inset-0 z-0">
          <Scene3D scroll={scrollYProgress} mode={mode} />
        </div>
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-[#05060a]" />

        <motion.div
          style={{ y: contentY, opacity: contentOpacity }}
          className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/70 backdrop-blur-md"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> The AI web & mobile app builder
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.05 }}
            className="max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
          >
            Turn a prompt into a
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent"> real app.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.15 }}
            className="mt-5 max-w-xl text-base text-white/60 sm:text-lg"
          >
            Describe your idea and Emergent builds a full-stack web or mobile app — design, code, and backend included.
          </motion.p>

          {/* PROMPT BOX */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.25 }}
            className="mt-8 w-full max-w-2xl"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(139,92,246,0.5)]">
              {/* mode switcher */}
              <div className="flex items-center gap-1 p-1">
                <div className="relative flex rounded-xl bg-black/30 p-1">
                  {[{ k: 'web', label: 'Web App', Icon: Globe }, { k: 'mobile', label: 'Mobile App', Icon: Smartphone }].map(({ k, label, Icon }) => (
                    <button
                      key={k}
                      onClick={() => setMode(k)}
                      className={`relative z-10 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${mode === k ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                    >
                      {mode === k && (
                        <motion.span layoutId="modePill" className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-violet-500/80 to-cyan-500/70 shadow-[0_0_20px_rgba(139,92,246,0.5)]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                      )}
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative mt-1 flex items-end gap-2 rounded-xl bg-black/30 p-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={2}
                  placeholder={`${placeholder}\u2588`}
                  className="min-h-[52px] w-full resize-none bg-transparent px-1 py-1 text-left text-[15px] text-white placeholder:text-white/35 outline-none"
                />
                <Link
                  href="/"
                  className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] transition-shadow"
                >
                  <Zap className="h-4 w-4" /> Start building
                </Link>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-white/40">
              <span className="text-white/30">Try:</span>
              {EXAMPLES[mode].slice(0, 3).map((ex) => (
                <button key={ex} onClick={() => setPrompt(ex)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:border-violet-400/40 hover:text-white/70 transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* scroll cue */}
        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-white/40">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }} className="flex flex-col items-center gap-1 text-[11px]">
            <span>Scroll to explore</span>
            <div className="h-8 w-5 rounded-full border border-white/20 p-1"><div className="h-2 w-full rounded-full bg-white/40" /></div>
          </motion.div>
        </div>
      </section>

      {/* MARQUEE / TRUST */}
      <section className="relative z-10 border-y border-white/5 bg-white/[0.02] py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 text-sm text-white/35">
          <span className="inline-flex items-center gap-2"><Rocket className="h-4 w-4" /> Ship in minutes</span>
          <span className="inline-flex items-center gap-2"><Database className="h-4 w-4" /> Full-stack by default</span>
          <span className="inline-flex items-center gap-2"><Smartphone className="h-4 w-4" /> Web + mobile</span>
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Production ready</span>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-5 py-24 sm:py-32">
        <Reveal>
          <p className="text-center text-sm font-medium uppercase tracking-[0.2em] text-violet-400">Capabilities</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-5xl">Everything you need to build, in one place</h2>
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/20">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-40 transition-opacity group-hover:opacity-70" style={{ background: f.color }} />
                <div className="relative">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5" style={{ boxShadow: `0 0 24px ${f.color}55` }}>
                    <f.icon className="h-5 w-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{f.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-5xl">From idea to live app in 3 steps</h2>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-7">
                <span className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-5xl font-bold text-transparent">{s.n}</span>
                <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-white/55">{s.desc}</p>
                {i < STEPS.length - 1 && <ChevronRight className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-white/20 md:block" />}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* SHOWCASE */}
      <section id="showcase" className="relative z-10 mx-auto max-w-7xl px-5 py-20">
        <div className="grid items-center gap-10 rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">Live preview</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">See your app come alive as you type</h2>
              <p className="mt-4 text-white/55">Emergent generates a working interface, connects a real database, and lets you refine everything by chatting. No boilerplate, no setup.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {['Auth', 'Database', 'Payments', 'File uploads', 'AI features'].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70"><Star className="h-3 w-3 text-amber-300" /> {t}</span>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-400/70" /><span className="h-3 w-3 rounded-full bg-amber-400/70" /><span className="h-3 w-3 rounded-full bg-emerald-400/70" />
                <span className="ml-3 text-xs text-white/40">emergent.build/preview</span>
              </div>
              <div className="space-y-3 p-5">
                {[0, 1, 2].map((r) => (
                  <motion.div key={r} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 * r }} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500/60 to-cyan-500/50" />
                    <div className="flex-1 space-y-2">
                      <div className="h-2.5 w-1/2 rounded-full bg-white/15" />
                      <div className="h-2.5 w-3/4 rounded-full bg-white/10" />
                    </div>
                  </motion.div>
                ))}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((c) => (
                    <div key={c} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="h-16 rounded-lg bg-gradient-to-br from-white/10 to-transparent" />
                      <div className="mt-2 h-2 w-2/3 rounded-full bg-white/15" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 mx-auto max-w-5xl px-5 py-24 text-center">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-violet-600/15 to-cyan-500/5 px-6 py-16">
            <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.4),transparent_60%)]" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">Your next app is one prompt away</h2>
              <p className="mx-auto mt-4 max-w-lg text-white/60">Start building for free. Describe it, watch it build, ship it live.</p>
              <Link href="/" className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-7 py-3.5 text-base font-semibold text-white shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:shadow-[0_0_60px_rgba(34,211,238,0.6)] transition-shadow">
                Start building <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-white/60">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>
            <span className="text-sm">Emergent · Build anything</span>
          </div>
          <p className="text-xs text-white/35">© {new Date().getFullYear()} Emergent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
