'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, ClipboardList, Flame, Sparkles, Target, TrendingUp, XCircle } from 'lucide-react'
import { useStudyData, type StudyAttempt, type StudyTestResult } from '@/lib/study-data'
import { useAuth } from '@/lib/auth-context'

function dayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date)
}

function formatDuration(seconds: number) {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

function testKindLabel(kind: StudyTestResult['kind']) {
  if (kind === 'smart') return 'Smart test'
  if (kind === 'chapter-test') return 'Chapter test'
  if (kind === 'subject-test') return 'Subject-wise test'
  if (kind === 'full-test') return 'Full test'
  return 'Mock test'
}

export default function PerformancePage() {
  const study = useStudyData()
  const { user } = useAuth()
  const [goalDraft, setGoalDraft] = useState('')

  useEffect(() => {
    if (study.hydrated) setGoalDraft(String(study.dailyGoal))
  }, [study.hydrated, study.dailyGoal])

  const stats = useMemo(() => {
    const attempts = study.attempts
    const correct = attempts.filter((attempt) => attempt.correct).length
    const wrong = attempts.length - correct
    const accuracy = attempts.length ? Math.round((correct / attempts.length) * 100) : 0
    const totalSeconds = attempts.reduce((sum, attempt) => sum + (attempt.elapsedSeconds || 0), 0)
    const averageSeconds = attempts.length && totalSeconds ? Math.round(totalSeconds / attempts.length) : 0

    const group = (keyFor: (attempt: StudyAttempt) => string) => {
      const map = new Map<string, { total: number; correct: number; seconds: number }>()
      attempts.forEach((attempt) => {
        const key = keyFor(attempt) || 'Unspecified'
        const value = map.get(key) || { total: 0, correct: 0, seconds: 0 }
        value.total++
        if (attempt.correct) value.correct++
        value.seconds += attempt.elapsedSeconds || 0
        map.set(key, value)
      })
      return Array.from(map.entries()).map(([key, value]) => ({ key, ...value, accuracy: value.total ? Math.round((value.correct / value.total) * 100) : 0 }))
    }

    const bySubject = group((attempt) => attempt.subjectName)
    const byChapter = group((attempt) => `${attempt.subjectName}||${attempt.chapterName}||${attempt.subjectSlug}||${attempt.chapterSlug}`)
    const byDifficulty = group((attempt) => attempt.difficulty)
    const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      const key = dayKey(date)
      const dayAttempts = attempts.filter((attempt) => dayKey(new Date(attempt.occurredAt)) === key)
      return { key, label: dayLabel(date), count: dayAttempts.length, correct: dayAttempts.filter((attempt) => attempt.correct).length }
    })
    const weakChapters = byChapter
      .filter((chapter) => chapter.total >= 2 && chapter.accuracy < 50)
      .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)
    const testResults = [...study.testResults].sort((a, b) => b.completedAt - a.completedAt)
    return { attempts, correct, wrong, accuracy, totalSeconds, averageSeconds, bySubject, byChapter, byDifficulty, lastSevenDays, weakChapters, testResults }
  }, [study.attempts, study.testResults])

  const maxWeeklyCount = Math.max(1, ...stats.lastSevenDays.map((day) => day.count))
  const activeMistakes = Object.values(study.mistakes).filter((item) => item.status === 'needs-revision').length

  function saveGoal(event: React.FormEvent) {
    event.preventDefault()
    const nextGoal = Number(goalDraft)
    if (Number.isFinite(nextGoal) && nextGoal > 0) study.setDailyGoal(nextGoal)
  }

  if (!study.hydrated) return <div className="flex min-h-[55vh] items-center justify-center"><Activity className="animate-pulse text-brand-600" size={25} /></div>

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 pb-28 sm:py-10">
      <header className="rounded-3xl bg-gradient-to-br from-[#0f766e] via-[#159a87] to-[#39b98f] p-5 text-white shadow-card sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold"><Activity size={14} /> Your learning, measured</span><h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Performance</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-white/90">A clear view of your practice, test scores, consistency, and chapters to revisit.</p></div><div className="flex flex-wrap gap-2"><Link href="/tests" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-brand-800 shadow-sm transition hover:bg-emerald-50">Take a chapter test <ArrowRight size={15} /></Link><Link href="/smart-test" aria-label="Start a Smart Test" className="grid h-10 w-10 place-items-center rounded-xl border border-white/30 bg-white/10 text-white hover:bg-white/20"><Sparkles size={17} /></Link></div></div>
      </header>

      {!user && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">Your performance is saved in this browser. Sign in from the top bar to sync your study data across devices.</div>}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Performance summary">
        <Metric label="Question attempts" value={stats.attempts.length.toLocaleString()} icon={<BookOpenCheck size={18} />} tone="teal" />
        <Metric label="Correct answers" value={stats.correct.toLocaleString()} icon={<CheckCircle2 size={18} />} tone="green" />
        <Metric label="Wrong attempts" value={stats.wrong.toLocaleString()} icon={<XCircle size={18} />} tone="rose" />
        <Metric label="Overall accuracy" value={stats.attempts.length ? `${stats.accuracy}%` : '—'} icon={<Target size={18} />} tone="violet" />
        <Metric label="Tests completed" value={stats.testResults.length.toLocaleString()} icon={<ClipboardList size={18} />} tone="amber" />
      </section>

      {!stats.attempts.length && !stats.testResults.length && <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-4"><div><p className="font-bold text-ink-900">Your report starts with your first answer.</p><p className="mt-1 text-xs text-slate-600">Practice or complete a test; your scores, time, and chapter accuracy will appear here.</p></div><Link href="/pyqs" className="inline-flex items-center gap-1 rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-bold text-white">Practice PYQs <ArrowRight size={13} /></Link></section>}

      <div className="mt-5 grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Consistency</p><h2 className="mt-1 font-display text-lg font-bold text-ink-900">Streak &amp; daily goal</h2></div><Flame size={20} className="text-orange-500" /></div><div className="mt-5 flex items-center gap-5"><div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#108b77 ${study.todayGoalProgress * 3.6}deg, #e2e8f0 0deg)` }}><div className="grid h-[5.25rem] w-[5.25rem] place-items-center rounded-full bg-white text-center"><div><p className="font-display text-xl font-extrabold text-ink-900">{study.todayGoalProgress}%</p><p className="text-[10px] text-slate-500">today</p></div></div></div><div><p className="font-display text-3xl font-extrabold text-ink-900">🔥 {study.streak}</p><p className="text-xs text-slate-500">consecutive study days</p><p className="mt-2 text-sm font-semibold text-ink-800">{study.todaySolved} / {study.dailyGoal} questions today</p></div></div><form onSubmit={saveGoal} className="mt-5 flex flex-wrap items-center gap-2"><label htmlFor="daily-goal" className="text-xs font-semibold text-slate-500">Daily goal</label><input id="daily-goal" type="number" min="1" max="300" value={goalDraft} onChange={(event) => setGoalDraft(event.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-brand-400" /><button className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white">Save goal</button></form></section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recent rhythm</p><h2 className="mt-1 font-display text-lg font-bold text-ink-900">Last 7 days</h2></div><TrendingUp size={20} className="text-brand-600" /></div><div className="mt-5 flex h-36 items-end justify-between gap-2">{stats.lastSevenDays.map((day) => <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-semibold text-slate-500">{day.count || ''}</span><div className="flex h-24 w-full items-end overflow-hidden rounded-lg bg-slate-100"><div className="w-full rounded-lg bg-gradient-to-t from-brand-700 to-brand-400 transition-all" style={{ height: `${day.count ? Math.max(8, (day.count / maxWeeklyCount) * 100) : 0}%` }} /></div><span className="text-[10px] text-slate-500">{day.label}</span></div>)}</div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500"><span><strong className="text-ink-800">{Math.floor(stats.totalSeconds / 3600)}h {Math.floor((stats.totalSeconds % 3600) / 60)}m</strong> tracked study time</span><span><strong className="text-ink-800">{formatDuration(stats.averageSeconds)}</strong> avg. time per answer</span></div></section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold text-ink-900">Subject accuracy</h2><span className="text-xs text-slate-400">from answered questions</span></div>{stats.bySubject.length ? <div className="mt-4 space-y-3">{[...stats.bySubject].sort((a, b) => b.accuracy - a.accuracy).map((item) => <AccuracyRow key={item.key} label={item.key} accuracy={item.accuracy} count={item.total} />)}</div> : <Empty text="Your subject breakdown will appear after you answer questions." />}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold text-ink-900">Difficulty accuracy</h2><span className="text-xs text-slate-400">easy · medium · difficult</span></div>{stats.byDifficulty.length ? <div className="mt-4 space-y-3">{[...stats.byDifficulty].sort((a, b) => a.accuracy - b.accuracy).map((item) => <AccuracyRow key={item.key} label={item.key} accuracy={item.accuracy} count={item.total} />)}</div> : <Empty text="Difficulty trends appear after your first answers." />}</section>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-ink-900">Chapters to revisit</h2><p className="mt-1 text-xs text-slate-500">At least 2 attempts and below 50% accuracy. Recommendations are based only on your answers.</p></div><Link href="/smart-test" className="inline-flex items-center gap-1 text-xs font-bold text-brand-700">Build a Smart Test <ArrowRight size={14} /></Link></div>{stats.weakChapters.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{stats.weakChapters.slice(0, 6).map((item) => {const [, chapterName, subjectSlug, chapterSlug] = item.key.split('||'); const subjectName = item.key.split('||')[0]; return <div key={item.key} className="rounded-xl border border-rose-100 bg-rose-50/70 p-4"><div className="flex items-center justify-between gap-2"><div><p className="font-bold text-ink-900">{chapterName}</p><p className="text-xs text-slate-500">{subjectName}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-rose-700">{item.accuracy}%</span></div><p className="mt-2 text-xs text-rose-900">{item.correct} correct out of {item.total} attempts</p><Link href={`/practice?source=weak&subject=${encodeURIComponent(subjectSlug)}&chapter=${encodeURIComponent(chapterSlug)}`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-rose-800">Practice chapter <ArrowRight size={13} /></Link></div>})}</div> : <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{stats.byChapter.length ? 'No weak chapters detected yet—keep practicing to refresh this view.' : 'Once you answer chapter questions, this report will surface the areas that need another look.'}</div>}</section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold text-ink-900">Chapter accuracy</h2><CalendarDays size={18} className="text-brand-600" /></div>{stats.byChapter.length ? <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">{[...stats.byChapter].sort((a, b) => a.accuracy - b.accuracy).slice(0, 12).map((item) => {const [subject, chapter] = item.key.split('||'); return <AccuracyRow key={item.key} label={`${subject} · ${chapter}`} accuracy={item.accuracy} count={item.total} />})}</div> : <Empty text="Chapter-level insights appear after you record attempts." />}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-bold text-ink-900">Recent test results</h2><p className="mt-1 text-xs text-slate-500">Chapter, Smart, and Mock tests completed on this account.</p></div><span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">{stats.testResults.length}</span></div>{stats.testResults.length ? <div className="mt-4 space-y-2.5">{stats.testResults.slice(0, 6).map((result) => <TestResultRow key={result.id} result={result} />)}</div> : <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Your completed test scores will show here.</p><Link href="/tests" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-700">Start a chapter test <ArrowRight size={13} /></Link></div>}</section>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-ink-900">Latest answers</h2><p className="mt-1 text-xs text-slate-500">Your five most recent recorded question attempts.</p></div><Link href="/mistakes" className="inline-flex items-center gap-1 rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-bold text-white">Mistake book ({activeMistakes}) <ArrowRight size={13} /></Link></div>{stats.attempts.length ? <div className="mt-3 divide-y divide-slate-100">{[...stats.attempts].slice(-5).reverse().map((attempt) => <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink-900">{attempt.subjectName} · {attempt.chapterName}</p><p className="text-xs text-slate-500">{new Date(attempt.occurredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {attempt.difficulty || 'Difficulty not set'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${attempt.correct ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{attempt.correct ? 'Correct' : 'Review'}</span></div>)}</div> : <Empty text="Your recent answers will appear here." />}</section>
    </div>
  )
}

function Metric({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: 'teal' | 'green' | 'rose' | 'violet' | 'amber' }) {
  const styles = { teal: 'bg-brand-50 text-brand-700', green: 'bg-emerald-50 text-emerald-700', rose: 'bg-rose-50 text-rose-700', violet: 'bg-violet-50 text-violet-700', amber: 'bg-amber-50 text-amber-700' }
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"><span className={`grid h-9 w-9 place-items-center rounded-xl ${styles[tone]}`}>{icon}</span><p className="mt-3 font-display text-2xl font-extrabold text-ink-900">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
}

function AccuracyRow({ label, accuracy, count }: { label: string; accuracy: number; count: number }) {
  return <div><div className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate font-semibold text-ink-800">{label}</span><span className="shrink-0 text-slate-500">{accuracy}% · {count}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${accuracy < 50 ? 'bg-rose-500' : accuracy < 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${accuracy}%` }} /></div></div>
}

function TestResultRow({ result }: { result: StudyTestResult }) {
  const scope = result.subjectName && result.chapterName ? `${result.subjectName} · ${result.chapterName}` : 'Mixed subjects'
  const date = new Date(result.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-ink-900">{testKindLabel(result.kind)} <span className="font-medium text-slate-400">· {result.examName}</span></p><p className="mt-0.5 text-xs text-slate-500">{scope} · {date}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-brand-800">{result.accuracy}%</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600"><span>{result.marks} / {result.maxMarks} marks</span><span>{result.correct} correct · {result.wrong} wrong</span><span>{formatDuration(result.elapsedSeconds)}</span></div></div>
}

function Empty({ text }: { text: string }) {
  return <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{text}</p>
}
