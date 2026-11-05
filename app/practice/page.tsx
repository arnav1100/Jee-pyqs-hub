'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bookmark, Check, ChevronLeft, ChevronRight, Flag, Loader2, RotateCcw, Sparkles, Timer } from 'lucide-react'
import DifficultyBadge from '@/components/DifficultyBadge'
import MathText from '@/components/MathText'
import QuestionNavigator from '@/components/QuestionNavigator'
import QuestionCard from '@/components/QuestionCard'
import Celebration from '@/components/Celebration'
import { useQuestionLibrary, inferExamNames, type QuestionLibraryItem } from '@/lib/question-library'
import { useStudyData, isStudyAnswerCorrect } from '@/lib/study-data'
import { useExamCatalog } from '@/lib/exam-catalog'

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

export default function PracticePage() {
  const router = useRouter()
  const { questions, loading } = useQuestionLibrary()
  const { categories } = useExamCatalog()
  const study = useStudyData()
  const [routeParams, setRouteParams] = useState<Record<string, string>>({})
  const requestedId = routeParams.id || ''
  const requestedSource = routeParams.source || 'all'
  const [exam, setExam] = useState('JEE Main')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [seconds, setSeconds] = useState(0)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportText, setReportText] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const questionStartedAt = useRef(Date.now())

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const values: Record<string, string> = {}
    for (const key of ['id', 'source', 'subject', 'chapter', 'exam']) {
      const value = params.get(key)
      if (value) values[key] = value
    }
    setRouteParams(values)
    if (values.exam) setExam(values.exam)
  }, [])

  const examNames = useMemo(() => Array.from(new Set([...categories.map((category) => category.name), ...inferExamNames(questions)])), [categories, questions])
  const sessionsQuestions = useMemo(() => {
    let rows = questions.filter((question) => question.examType === exam)
    if (requestedSource === 'mistakes') rows = rows.filter((question) => study.mistakes[question.id]?.status === 'needs-revision')
    if (requestedSource === 'bookmarks') rows = rows.filter((question) => study.bookmarks.includes(question.id))
    if (requestedSource === 'weak') {
      const chapterTotals = study.attempts.reduce((acc, attempt) => {
        const key = `${attempt.subjectSlug}/${attempt.chapterSlug}`
        const current = acc.get(key) || { correct: 0, total: 0 }
        current.total++
        if (attempt.correct) current.correct++
        acc.set(key, current)
        return acc
      }, new Map<string, { correct: number; total: number }>())
      const weakChapters = new Set(Array.from(chapterTotals.entries()).filter(([, result]) => result.total >= 2 && result.correct / result.total < 0.5).map(([key]) => key))
      rows = rows.filter((question) => weakChapters.has(`${question.subjectSlug}/${question.chapterSlug}`))
    }
    const subject = routeParams.subject
    const chapter = routeParams.chapter
    if (subject) rows = rows.filter((question) => question.subjectSlug === subject || question.subjectName.toLowerCase() === subject.toLowerCase())
    if (chapter) rows = rows.filter((question) => question.chapterSlug === chapter || question.chapterName.toLowerCase() === chapter.toLowerCase())
    if (requestedId) {
      const first = rows.find((question) => question.id === requestedId)
      if (first) rows = [first, ...rows.filter((question) => question.id !== requestedId)]
    }
    return rows
  }, [questions, exam, requestedSource, requestedId, routeParams, study.mistakes, study.bookmarks, study.attempts])

  const question = sessionsQuestions[Math.min(index, Math.max(0, sessionsQuestions.length - 1))]
  const currentQuestionId = question?.id
  const currentAnswer = question ? answers[question.id] || '' : ''
  const currentChecked = question ? Boolean(checked[question.id]) : false
  const correct = question && currentAnswer ? isStudyAnswerCorrect(question, currentAnswer) : false
  const mistake = question ? study.mistakes[question.id] : undefined
  const answeredIndices = new Set(sessionsQuestions.map((item, itemIndex) => checked[item.id] ? itemIndex : -1).filter((itemIndex) => itemIndex >= 0))
  const bookmarkedIndices = new Set(sessionsQuestions.map((item, itemIndex) => study.bookmarks.includes(item.id) ? itemIndex : -1).filter((itemIndex) => itemIndex >= 0))

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setIndex(0)
    setAnswers({})
    setChecked({})
    questionStartedAt.current = Date.now()
  }, [exam, requestedSource, requestedId])

  useEffect(() => {
    setNoteDraft(currentQuestionId ? study.notes[currentQuestionId] || '' : '')
    questionStartedAt.current = Date.now()
  }, [currentQuestionId, study.notes])

  const selectAnswer = useCallback((answer: string) => {
    if (!question || currentChecked) return
    setAnswers((current) => ({ ...current, [question.id]: answer }))
  }, [question, currentChecked])

  const checkAnswer = useCallback(() => {
    if (!question || !currentAnswer || currentChecked) return
    study.recordAnswer(question, currentAnswer, (Date.now() - questionStartedAt.current) / 1000)
    setChecked((current) => ({ ...current, [question.id]: true }))
  }, [question, currentAnswer, currentChecked, study])

  const goTo = useCallback((nextIndex: number) => {
    setIndex(Math.max(0, Math.min(sessionsQuestions.length - 1, nextIndex)))
  }, [sessionsQuestions.length])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(index - 1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); goTo(index + 1) }
      if (event.key === 'Enter') { event.preventDefault(); currentChecked ? goTo(index + 1) : checkAnswer() }
      if (event.key.toLowerCase() === 'm' && question) study.toggleReview(question.id)
      if (event.key.toLowerCase() === 'b' && question) study.toggleBookmark(question.id)
      if (!currentChecked && question && question.questionType !== 'numerical') {
        const option = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', a: 'A', b: 'B', c: 'C', d: 'D' }[event.key.toLowerCase()]
        if (option && question.options.some((item) => item.id === option)) selectAnswer(option)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goTo, index, currentChecked, question, study, checkAnswer, selectAnswer])

  function handleClear() {
    if (!question) return
    setAnswers((current) => { const next = { ...current }; delete next[question.id]; return next })
    setChecked((current) => { const next = { ...current }; delete next[question.id]; return next })
    questionStartedAt.current = Date.now()
  }

  function handleReportSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!question || !reportText.trim()) return
    study.reportQuestion(question.id, reportText.trim())
    setReportText('')
    setReportOpen(false)
  }

  if (loading || !study.hydrated) return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="animate-spin text-brand-600" /></div>

  if (!sessionsQuestions.length) {
    return <div className="mx-auto max-w-xl px-4 py-20 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Sparkles size={24} /></span><h1 className="mt-4 font-display text-2xl font-bold text-ink-900">No questions in this session</h1><p className="mt-2 text-sm text-slate-500">{requestedSource === 'mistakes' ? 'Your active mistake book is clear. Practice some PYQs and missed answers will be added automatically.' : requestedSource === 'bookmarks' ? 'Bookmark questions in the library to build a personal revision set.' : 'There are no loaded questions for this exam and filter yet.'}</p><div className="mt-5 flex justify-center gap-2"><Link href="/pyqs" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white">Open question library</Link><Link href="/" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-ink-700">Home</Link></div></div>
  }

  const title = requestedSource === 'mistakes' ? 'Mistake revision' : requestedSource === 'bookmarks' ? 'Bookmarked revision' : requestedSource === 'weak' ? 'Weak chapter practice' : 'Practice mode'
  const isBookmarked = study.bookmarks.includes(question.id)
  const isMarkedForReview = study.reviewed.includes(question.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:py-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><Link href="/pyqs" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-700"><ChevronLeft size={14} /> Question library</Link><h1 className="font-display text-2xl font-bold text-ink-900">{title}</h1><p className="mt-1 text-xs text-slate-500">Immediate feedback · detailed solution · your progress saves automatically</p></div>
        <div className="flex items-center gap-2"><label className="text-xs font-semibold text-slate-500">Exam</label><select value={exam} onChange={(event) => { setExam(event.target.value); router.replace(`/practice?exam=${encodeURIComponent(event.target.value)}${requestedSource !== 'all' ? `&source=${requestedSource}` : ''}`) }} className="admin-input max-w-[190px]">{examNames.map((name) => <option key={name}>{name}</option>)}</select><span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-600"><Timer size={14} />{formatDuration(seconds)}</span></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500"><span className="font-bold text-ink-800">{question.subjectName} · {question.chapterName}</span><span>·</span><span>{question.examType} {question.year}{question.shift ? ` · ${question.shift}` : ''}</span><span className="ml-auto">Question {index + 1} of {sessionsQuestions.length}</span></div>
          <QuestionCard question={question} selectedOptionId={currentAnswer} showSolution={currentChecked} isBookmarked={isBookmarked} onSelectOption={selectAnswer} onToggleBookmark={() => study.toggleBookmark(question.id)} />
          {currentChecked && correct && <Celebration />}
          {currentChecked && <div className={`mt-3 rounded-xl border p-3 text-sm ${correct ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            {correct ? <div className="flex items-center gap-2 font-bold"><span className="text-lg">🎉</span>Correct! Great work — keep the momentum going.</div> : <div><p className="font-bold">Good attempt. This one is now saved in your Mistake Book.</p><p className="mt-1 text-xs">Take a breath, review the steps, and try a similar question next.</p></div>}
            {mistake?.status === 'needs-revision' && correct && <button onClick={() => study.markMistakeMastered(question.id)} className="mt-2 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white">Mark mistake as mastered ✅</button>}
          </div>}
          {mistake?.status === 'needs-revision' && !currentChecked && mistake.previousWrongAnswer && <p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800">Revision hint: last time you chose <strong>{mistake.previousWrongAnswer}</strong>. The correct answer stays hidden until you check.</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block rounded-xl border border-slate-200 bg-white p-3"><span className="text-xs font-bold text-slate-600">Personal revision note</span><textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} onBlur={() => study.setQuestionNote(question.id, noteDraft)} rows={2} placeholder="Add a formula, reminder, or your own explanation…" className="mt-2 w-full resize-y border-0 p-0 text-sm text-ink-900 outline-none placeholder:text-slate-400" /></label>
            <div className="flex flex-wrap gap-2 sm:flex-col sm:justify-end"><button onClick={() => setReportOpen((value) => !value)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-700"><Flag size={14} /> Report</button><button onClick={() => study.toggleReview(question.id)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${isMarkedForReview ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600'}`}>{isMarkedForReview ? '🟣 Marked' : 'Mark for review'}</button></div>
          </div>
          {reportOpen && <form onSubmit={handleReportSubmit} className="mt-3 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3"><input value={reportText} onChange={(event) => setReportText(event.target.value)} placeholder="Describe the issue (answer, typo, image…)" className="min-w-0 flex-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs outline-none" /><button className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">Send report</button></form>}
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-card lg:sticky lg:top-24">
          <div className="flex items-center justify-between"><h2 className="font-display text-sm font-bold text-ink-900">Question palette</h2><span className="text-[11px] text-slate-400">1–4 · arrows · M · B</span></div>
          <div className="mt-3 max-h-52 overflow-y-auto"><QuestionNavigator total={sessionsQuestions.length} currentIndex={index} answeredIndices={answeredIndices} bookmarkedIndices={bookmarkedIndices} onSelect={goTo} /></div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500"><span>● Checked</span><span>○ Unchecked</span><span>★ Bookmarked</span><span>🟣 Review</span></div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3"><div className="flex justify-between text-xs"><span className="text-slate-500">Session progress</span><strong className="text-ink-900">{answeredIndices.size}/{sessionsQuestions.length}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.round((answeredIndices.size / sessionsQuestions.length) * 100)}%` }} /></div></div>
        </aside>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <button onClick={() => goTo(index - 1)} disabled={index === 0} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-ink-700 disabled:opacity-40"><ChevronLeft size={16} /> Prev</button>
          <button onClick={handleClear} disabled={!currentAnswer} className="hidden items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-40 sm:inline-flex"><RotateCcw size={14} /> Clear</button>
          {currentChecked ? <button onClick={() => goTo(index + 1)} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white">Next <ChevronRight size={16} /></button> : <button onClick={checkAnswer} disabled={!currentAnswer} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink-900 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Check size={16} /> Check answer</button>}
          <button onClick={() => study.toggleBookmark(question.id)} className={`grid h-11 w-11 place-items-center rounded-xl border ${isBookmarked ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500'}`} aria-label="Bookmark question"><Bookmark size={17} fill={isBookmarked ? 'currentColor' : 'none'} /></button>
          <button onClick={() => goTo(index + 1)} disabled={index >= sessionsQuestions.length - 1} className="hidden items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-ink-700 disabled:opacity-40 sm:inline-flex">Skip <ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  )
}
