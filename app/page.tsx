'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Activity, ArrowRight, BookOpen, BookOpenCheck, CheckCircle2, Flame, FolderOpen, NotebookPen, Sparkles, Target, Timer } from 'lucide-react'
import { useQuestionLibrary } from '@/lib/question-library'
import { useExamCatalog } from '@/lib/exam-catalog'
import { useStudyData } from '@/lib/study-data'

const PRIMARY_SUBJECTS = ['Physics', 'Chemistry', 'Mathematics']

export default function HomePage() {
  const { questions, loading } = useQuestionLibrary()
  const { categories } = useExamCatalog()
  const study = useStudyData()

  const subjectNames = useMemo(() => {
    const configured = categories.find((category) => category.name === 'JEE Main')?.subjects || PRIMARY_SUBJECTS
    const loaded = questions.filter((question) => question.examType === 'JEE Main').map((question) => question.subjectName)
    const names = new Map<string, string>()
    ;[...configured, ...loaded].forEach((name) => {
      const clean = name.trim()
      if (clean && !names.has(clean.toLowerCase())) names.set(clean.toLowerCase(), clean)
    })
    return Array.from(names.values())
  }, [categories, questions])

  const subjectCounts = useMemo(() => {
    const counts = new Map<string, number>()
    questions.filter((question) => question.examType === 'JEE Main').forEach((question) => {
      counts.set(question.subjectName.toLowerCase(), (counts.get(question.subjectName.toLowerCase()) || 0) + 1)
    })
    return counts
  }, [questions])

  const totalQuestions = questions.filter((question) => question.examType === 'JEE Main').length
  const accuracy = study.attempts.length
    ? Math.round((study.attempts.filter((attempt) => attempt.correct).length / study.attempts.length) * 100)
    : null

  return (
    <div className="min-h-[calc(100dvh-56px)] bg-[#f7fbf8] pb-24">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f766e] via-[#149b87] to-[#39b98f] text-white">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-yellow-200/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-36 left-[42%] h-80 w-80 rounded-full border-[28px] border-white/10" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[1.25fr_.75fr] lg:items-center lg:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold text-white"><Sparkles size={14} /> JEE prep, made simpler</span>
            <h1 className="mt-4 max-w-2xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Small steps. Strong concepts. <span className="text-yellow-200">Your JEE journey.</span></h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/90 sm:text-base">Practice chapter-wise PYQs, take focused tests, and revisit the questions you missed—all in one calm, student-friendly space.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/pyqs" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#126a60] shadow-lg transition hover:-translate-y-0.5 hover:bg-yellow-50">Practice PYQs <ArrowRight size={16} /></Link>
              <Link href="/smart-test" className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"><Sparkles size={16} /> Try Smart Test</Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/25 bg-white/15 p-5 shadow-xl backdrop-blur-md sm:p-6">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-white/80">Your study snapshot</p><h2 className="mt-1 font-display text-lg font-bold">You’re making progress</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-200/25 text-yellow-100"><Flame size={22} /></span></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Snapshot label="JEE Main PYQs" value={loading ? '…' : totalQuestions.toLocaleString()} icon={<BookOpenCheck size={16} />} />
              <Snapshot label="Your accuracy" value={accuracy === null ? 'Let’s start' : `${accuracy}%`} icon={<Target size={16} />} />
            </div>
            <div className="mt-3 rounded-2xl bg-[#075c55]/35 p-4">
              <div className="flex items-center justify-between text-xs"><span className="font-semibold text-white/90">Today’s goal</span><strong>{study.todaySolved} / {study.dailyGoal}</strong></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-yellow-200 transition-all" style={{ width: `${study.todayGoalProgress}%` }} /></div>
              <p className="mt-2 text-[11px] text-white/80">{study.todayGoalProgress >= 100 ? 'Goal complete—brilliant work!' : `${study.streak} day streak · Keep your momentum going`}</p>
            </div>
            <Link href="/performance" className="mt-3 flex items-center justify-between rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"><span className="inline-flex items-center gap-2"><Activity size={15} /> View full performance</span><ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">

        <section className="py-8 sm:py-10">
          <div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-brand-700">Choose what you need</p><h2 className="mt-1 font-display text-2xl font-bold text-ink-900 sm:text-3xl">Simple ways to study</h2></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard href="/pyqs" icon={<BookOpen size={19} />} title="PYQ practice" description="Find a question by subject, chapter, year, or shift." tone="mint" />
            <FeatureCard href="/tests" icon={<CheckCircle2 size={19} />} title="Tests" description="Chapter-wise, subject-wise or full test — your choice." tone="sun" />
            <FeatureCard href="/mock-tests" icon={<Timer size={19} />} title="Mock test" description="Take a timed mixed test from your question bank." tone="sky" />
            <FeatureCard href="/smart-test" icon={<Sparkles size={19} />} title="Smart test" description="Mix your past mistakes with fresh questions from a chapter." tone="lilac" />
            <FeatureCard href="/mistakes" icon={<NotebookPen size={19} />} title="Mistake book" description="Review, retry, and master the questions you missed." tone="coral" />
            <FeatureCard href="/performance" icon={<Activity size={19} />} title="Performance" description="Accuracy, streaks, weak chapters and every finished test." tone="mint" />
            <FeatureCard href="/resources" icon={<FolderOpen size={19} />} title="Resources" description="Free notes and PDFs — plus paid packs you can unlock with UPI." tone="sun" />
          </div>
        </section>

        <section className="pb-10 sm:pb-14">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-brand-700">Start chapter-wise</p><h2 className="mt-1 font-display text-xl font-bold text-ink-900 sm:text-2xl">Pick a subject</h2></div><Link href="/pyqs" className="inline-flex items-center gap-1 text-xs font-bold text-brand-700">All PYQs <ArrowRight size={14} /></Link></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">{subjectNames.map((subject, index) => {
              const colors = [
                'from-emerald-50 to-teal-50 border-emerald-100 text-emerald-800',
                'from-amber-50 to-orange-50 border-amber-100 text-amber-800',
                'from-sky-50 to-cyan-50 border-sky-100 text-sky-800',
              ]
              const count = subjectCounts.get(subject.toLowerCase()) || 0
              return <Link key={subject} href={`/pyqs?exam=${encodeURIComponent('JEE Main')}&subject=${encodeURIComponent(subject)}`} className={`group rounded-2xl border bg-gradient-to-br p-4 transition hover:-translate-y-0.5 hover:shadow-card ${colors[index % colors.length]}`}><span className="text-[11px] font-bold uppercase tracking-wide opacity-75">JEE Main</span><h3 className="mt-2 font-display text-lg font-bold">{subject}</h3><div className="mt-2 flex items-center justify-between text-xs"><span>{count ? `${count.toLocaleString()} questions loaded` : 'Open chapter list'}</span><ArrowRight size={15} className="transition group-hover:translate-x-1" /></div></Link>
            })}</div>
          </div>
        </section>
      </div>
    </div>
  )
}

function Snapshot({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/20 bg-white/10 p-3"><div className="flex items-center justify-between text-white/85"><span className="text-[11px] font-semibold">{label}</span>{icon}</div><p className="mt-2 font-display text-xl font-extrabold text-white">{value}</p></div>
}

function FeatureCard({ href, icon, title, description, tone }: { href: string; icon: React.ReactNode; title: string; description: string; tone: 'mint' | 'sun' | 'sky' | 'lilac' | 'coral' }) {
  const themes = {
    mint: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    sun: 'bg-amber-50 text-amber-700 border-amber-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    lilac: 'bg-violet-50 text-violet-700 border-violet-100',
    coral: 'bg-rose-50 text-rose-700 border-rose-100',
  }
  return <Link href={href} className="group flex min-h-36 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg sm:p-5"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${themes[tone]}`}>{icon}</span><span><span className="block font-display text-base font-bold text-ink-900">{title}</span><span className="mt-1 block text-sm leading-5 text-slate-500">{description}</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-700">Open <ArrowRight size={13} className="transition group-hover:translate-x-1" /></span></span></Link>
}
