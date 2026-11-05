'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, Filter, RotateCcw, Sparkles } from 'lucide-react'
import MathText from '@/components/MathText'
import { useQuestionLibrary } from '@/lib/question-library'
import { useStudyData } from '@/lib/study-data'

export default function MistakesPage() {
  const { questions, loading } = useQuestionLibrary()
  const study = useStudyData()
  const [status, setStatus] = useState<'needs-revision' | 'mastered'>('needs-revision')
  const [subject, setSubject] = useState('')
  const [chapter, setChapter] = useState('')
  const [year, setYear] = useState('')
  const questionMap = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions])
  const mistakes = useMemo(() => Object.values(study.mistakes)
    .filter((mistake) => mistake.status === status)
    .map((mistake) => ({ mistake, question: questionMap.get(mistake.questionId) }))
    .filter(({ question }) => Boolean(question))
    .filter(({ question }) => !subject || question?.subjectName === subject)
    .filter(({ question }) => !chapter || question?.chapterName === chapter)
    .filter(({ question }) => !year || String(question?.year) === year)
    .sort((a, b) => b.mistake.lastAttemptAt - a.mistake.lastAttemptAt),
  [study.mistakes, questionMap, status, subject, chapter, year])
  const subjects = Array.from(new Set(Object.keys(study.mistakes).map((id) => questionMap.get(id)?.subjectName).filter((value): value is string => Boolean(value)))).sort()
  const chapters = Array.from(new Set(Object.keys(study.mistakes).map((id) => questionMap.get(id)).filter((question) => question && (!subject || question.subjectName === subject)).map((question) => question!.chapterName))).sort()
  const years = Array.from(new Set(Object.keys(study.mistakes).map((id) => questionMap.get(id)?.year).filter((value): value is number => typeof value === 'number'))).sort((a, b) => b - a)
  const activeCount = Object.values(study.mistakes).filter((mistake) => mistake.status === 'needs-revision').length
  const masteredCount = Object.values(study.mistakes).filter((mistake) => mistake.status === 'mastered').length

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:py-11">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"><Sparkles size={14} /> Revise with purpose</span><h1 className="mt-3 font-display text-3xl font-bold text-ink-900">Mistake book</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Incorrect answers are captured automatically. Re-attempt without seeing the answer, then mark a question mastered when you feel confident.</p></div><Link href="/practice?source=mistakes" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"><RotateCcw size={15} /> Re-attempt mistakes</Link></div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3"><Stat label="Needs revision" value={activeCount} tone="rose" /><Stat label="Mastered" value={masteredCount} tone="green" /><Stat label="Saved bookmarks" value={study.bookmarks.length} tone="blue" /></div>

      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-card"><span className="mr-1 inline-flex items-center gap-1 text-xs font-bold text-slate-500"><Filter size={14} /> Filter</span><button onClick={() => setStatus('needs-revision')} className={`rounded-lg px-3 py-2 text-xs font-bold ${status === 'needs-revision' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Needs revision</button><button onClick={() => setStatus('mastered')} className={`rounded-lg px-3 py-2 text-xs font-bold ${status === 'mastered' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Mastered</button><select value={subject} onChange={(event) => { setSubject(event.target.value); setChapter('') }} className="admin-input ml-auto max-w-[190px]"><option value="">All subjects</option>{subjects.map((value) => <option key={value}>{value}</option>)}</select><select value={chapter} onChange={(event) => setChapter(event.target.value)} className="admin-input max-w-[210px]"><option value="">All chapters</option>{chapters.map((value) => <option key={value}>{value}</option>)}</select><select value={year} onChange={(event) => setYear(event.target.value)} className="admin-input max-w-[130px]"><option value="">All years</option>{years.map((value) => <option key={value}>{value}</option>)}</select></div>

      {loading || !study.hydrated ? <div className="py-16 text-center text-sm text-slate-500">Loading your notebook…</div> : mistakes.length ? <div className="mt-4 space-y-3">{mistakes.map(({ mistake, question }) => question && <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">{question.subjectName} · {question.chapterName}</span><span className="text-xs text-slate-500">{question.examType} · {question.year}{question.shift ? ` · ${question.shift}` : ''}</span><span className="ml-auto text-xs font-semibold text-slate-500">Failed {mistake.failedCount} {mistake.failedCount === 1 ? 'time' : 'times'}</span></div><div className="mt-3 line-clamp-3 text-sm leading-6 text-ink-900"><MathText text={question.text} /></div><p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Last time you chose: <strong>{mistake.previousWrongAnswer}</strong> <span className="text-amber-700">· Correct answer is hidden until you re-attempt.</span></p><div className="mt-3 flex flex-wrap items-center gap-2"><Link href={`/practice?source=mistakes&id=${encodeURIComponent(question.id)}&exam=${encodeURIComponent(question.examType)}`} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-bold text-white">Re-attempt <ChevronRight size={14} /></Link>{status === 'needs-revision' && mistake.lastCorrectAt && <button onClick={() => study.markMistakeMastered(question.id)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700"><CheckCircle2 size={14} /> Mark mastered</button>}{status === 'mastered' && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={14} /> Mastered ✅</span>}</div></article>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={23} /></span><h2 className="mt-3 font-display text-lg font-bold text-ink-900">{status === 'needs-revision' ? 'No active mistakes — nice work!' : 'No mastered questions yet'}</h2><p className="mt-1 text-sm text-slate-500">{status === 'needs-revision' ? 'Keep practicing. Any incorrect response will be saved here automatically.' : 'Re-attempt a saved mistake correctly, then mark it mastered to see it here.'}</p><Link href="/pyqs" className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-ink-800">Browse PYQs</Link></div>}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'rose' | 'green' | 'blue' }) {
  const styles = { rose: 'bg-rose-50 text-rose-700', green: 'bg-emerald-50 text-emerald-700', blue: 'bg-brand-50 text-brand-700' }
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"><span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold ${styles[tone]}`}>{label}</span><p className="mt-2 font-display text-2xl font-extrabold text-ink-900">{value}</p></div>
}
