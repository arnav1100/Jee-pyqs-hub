'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Activity, Award, BookOpenCheck, CheckCircle2, Clock3, Crown, Flame, NotebookPen, Target, Trophy, XCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useStudyData } from '@/lib/study-data'
import { useQuestionLibrary } from '@/lib/question-library'
import AuthModal from '@/components/AuthModal'
import MathText from '@/components/MathText'

export default function DashboardPage() {
  const { user, access } = useAuth()
  const study = useStudyData()
  const { questions } = useQuestionLibrary()
  const [authOpen, setAuthOpen] = useState(false)
  const questionMap = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions])
  const attempted = study.attempts.length
  const correct = study.attempts.filter((attempt) => attempt.correct).length
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0
  const totalStudySeconds = study.attempts.reduce((sum, attempt) => sum + (attempt.elapsedSeconds || 0), 0)
  const lastAttempt = study.attempts[study.attempts.length - 1]
  const activeMistakes = Object.values(study.mistakes).filter((mistake) => mistake.status === 'needs-revision').length
  const badges = [
    { label: 'First 50 answers', detail: 'Build a strong base', active: attempted >= 50, icon: <BookOpenCheck size={17} /> },
    { label: '7-day streak', detail: 'Consistency champion', active: study.streak >= 7, icon: <Flame size={17} /> },
    { label: 'Perfect practice set', detail: '100% in a completed set', active: accuracy === 100 && attempted >= 10, icon: <Trophy size={17} /> },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:py-11">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700"><Activity size={14} /> Student dashboard</span><h1 className="mt-3 font-display text-3xl font-bold text-ink-900">Your preparation, at a glance</h1><p className="mt-1 text-sm text-slate-500">{user ? `Welcome back, ${user.displayName || user.email || 'student'}.` : 'Your practice works without sign-in and is saved in this browser.'}</p></div>{!user ? <button onClick={() => setAuthOpen(true)} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white">Sign in to sync</button> : <Link href="/premium" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700"><Crown size={15} className="text-brand-600" />{access.isPremium ? 'Premium active' : access.isTrialActive ? 'Free trial active' : 'Account settings'}</Link>}</div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Questions attempted" value={attempted} icon={<BookOpenCheck size={18} />} /><Stat label="Correct answers" value={correct} icon={<CheckCircle2 size={18} />} tone="green" /><Stat label="Incorrect answers" value={attempted - correct} icon={<XCircle size={18} />} tone="rose" /><Stat label="Overall accuracy" value={`${accuracy}%`} icon={<Target size={18} />} /></div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Daily progress</p><h2 className="mt-1 font-display text-lg font-bold text-ink-900">A little practice goes a long way</h2></div><Flame size={20} className="text-orange-500" /></div><div className="mt-5 flex items-center gap-5"><div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#16a34a ${study.todayGoalProgress * 3.6}deg, #e2e8f0 0deg)` }}><div className="grid h-[5.1rem] w-[5.1rem] place-items-center rounded-full bg-white text-center"><div><p className="font-display text-xl font-extrabold text-ink-900">{study.todayGoalProgress}%</p><p className="text-[10px] text-slate-500">goal</p></div></div></div><div><p className="font-display text-3xl font-extrabold text-ink-900">🔥 {study.streak}</p><p className="text-xs text-slate-500">day study streak</p><p className="mt-2 text-sm font-semibold text-ink-800">{study.todaySolved} of {study.dailyGoal} questions today</p></div></div><div className="mt-5 flex flex-wrap gap-2"><Link href="/practice" className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-bold text-white">Continue practice</Link><Link href="/performance" className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-bold text-ink-700">Performance analytics</Link></div></section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Continue where you left off</p><h2 className="mt-1 font-display text-lg font-bold text-ink-900">Your latest question</h2></div><Clock3 size={19} className="text-brand-600" /></div>{lastAttempt ? <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-brand-700">{lastAttempt.subjectName} · {lastAttempt.chapterName} · {lastAttempt.year}</p><p className="mt-2 line-clamp-2 text-sm text-ink-800">{questionMap.get(lastAttempt.questionId) ? <MathText text={questionMap.get(lastAttempt.questionId)!.text} /> : 'This question may no longer be in the loaded question bundle.'}</p><Link href={`/practice?id=${encodeURIComponent(lastAttempt.questionId)}&exam=${encodeURIComponent(lastAttempt.examType)}`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-700">Continue this question <span>→</span></Link></div> : <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold text-ink-800">Ready for your first session?</p><p className="mt-1 text-xs text-slate-500">Pick any PYQ. Your attempts, mistakes and bookmarks are saved as you study.</p><Link href="/pyqs" className="mt-3 inline-flex text-xs font-bold text-brand-700">Browse question library →</Link></div>}<div className="mt-4 flex gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500"><span>Total study time <strong className="text-ink-800">{Math.floor(totalStudySeconds / 3600)}h {Math.floor((totalStudySeconds % 3600) / 60)}m</strong></span><span>Active mistakes <strong className="text-rose-700">{activeMistakes}</strong></span></div></section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold text-ink-900">Subject performance</h2><Link href="/performance" className="text-xs font-bold text-brand-700">Full analytics →</Link></div><div className="mt-4 space-y-3">{['Physics', 'Chemistry', 'Mathematics'].map((subject) => {const records = study.attempts.filter((attempt) => attempt.subjectName.toLowerCase() === subject.toLowerCase()); const value = records.length ? Math.round((records.filter((attempt) => attempt.correct).length / records.length) * 100) : 0; return <div key={subject}><div className="flex items-center justify-between text-xs"><span className="font-semibold text-ink-800">{subject}</span><span className="text-slate-500">{records.length ? `${value}% · ${records.length} attempts` : 'Not started'}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${value < 50 ? 'bg-rose-500' : value < 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${value}%` }} /></div></div>})}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold text-ink-900">Milestone badges</h2><Award size={19} className="text-amber-500" /></div><div className="mt-3 space-y-2">{badges.map((badge) => <div key={badge.label} className={`flex items-center gap-3 rounded-xl p-3 ${badge.active ? 'bg-amber-50' : 'bg-slate-50 opacity-70'}`}><span className={`grid h-9 w-9 place-items-center rounded-xl ${badge.active ? 'bg-amber-100 text-amber-700' : 'bg-white text-slate-400'}`}>{badge.icon}</span><div className="flex-1"><p className="text-xs font-bold text-ink-900">{badge.label}</p><p className="text-[11px] text-slate-500">{badge.detail}</p></div><span className="text-xs font-bold">{badge.active ? 'Unlocked' : 'Keep going'}</span></div>)}</div></section></div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-card"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600"><NotebookPen size={19} /></span><div><h2 className="font-display text-sm font-bold text-ink-900">Mistake book</h2><p className="text-xs text-slate-500">{activeMistakes} question{activeMistakes === 1 ? '' : 's'} need revision · {study.bookmarks.length} bookmarked</p></div></div><Link href="/mistakes" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-ink-700">Open notebook</Link><Link href="/bookmarks" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-ink-700">Bookmarks</Link></div></div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}

function Stat({ label, value, icon, tone = 'blue' }: { label: string; value: string | number; icon: React.ReactNode; tone?: 'blue' | 'green' | 'rose' }) {
  const toneClass = tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-brand-50 text-brand-700'
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"><span className={`grid h-9 w-9 place-items-center rounded-xl ${toneClass}`}>{icon}</span><p className="mt-3 font-display text-2xl font-extrabold text-ink-900">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
}
