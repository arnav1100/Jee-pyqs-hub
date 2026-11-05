'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Flag, Loader2, RotateCcw, Send, Timer, XCircle } from 'lucide-react'
import MathText from '@/components/MathText'
import DifficultyBadge from '@/components/DifficultyBadge'
import QuestionNavigator from '@/components/QuestionNavigator'
import { ACTIVE_MOCK_SESSION_KEY, MOCK_PROGRESS_KEY, type MockSessionConfig, type SavedMockProgress } from '@/lib/mock-test-session'
import { useQuestionLibrary, type QuestionLibraryItem } from '@/lib/question-library'
import { useExamCatalog } from '@/lib/exam-catalog'
import { useStudyData, isStudyAnswerCorrect } from '@/lib/study-data'

const DEFAULT_MARKING_SCHEME = { correct: 4, incorrect: -1, unattempted: 0 }

function formatTime(total: number) {
  const value = Math.max(0, total)
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}

function readProgress(): SavedMockProgress {
  try {
    const raw = window.localStorage.getItem(MOCK_PROGRESS_KEY)
    if (!raw) return { answers: {}, reviewIds: [], visitedIds: [], submitted: false }
    const parsed = JSON.parse(raw)
    return {
      answers: parsed.answers || {},
      reviewIds: Array.isArray(parsed.reviewIds) ? parsed.reviewIds : [],
      visitedIds: Array.isArray(parsed.visitedIds) ? parsed.visitedIds : [],
      submitted: Boolean(parsed.submitted),
    }
  } catch {
    return { answers: {}, reviewIds: [], visitedIds: [], submitted: false }
  }
}

export default function MockTestSessionPage() {
  const router = useRouter()
  const { questions, loading } = useQuestionLibrary()
  const { categories } = useExamCatalog()
  const study = useStudyData()
  const recordTestResult = study.recordTestResult
  const testResults = study.testResults
  const [session, setSession] = useState<MockSessionConfig | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [reviewIds, setReviewIds] = useState<string[]>([])
  const [visitedIds, setVisitedIds] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [practiceChecked, setPracticeChecked] = useState<string[]>([])
  const recorded = useRef(false)
  const resultRecorded = useRef(false)
  const submitRef = useRef<() => void>(() => {})

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ACTIVE_MOCK_SESSION_KEY)
      const parsed = raw ? JSON.parse(raw) as MockSessionConfig : null
      const progress = readProgress()
      if (parsed?.questionIds?.length) {
        setSession(parsed)
        setAnswers(progress.answers)
        setReviewIds(progress.reviewIds)
        setVisitedIds(progress.visitedIds)
        setSubmitted(progress.submitted)
        setSecondsLeft(parsed.durationSeconds)
      }
    } catch {
      setSession(null)
    }
  }, [])

  const questionMap = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions])
  const testQuestions = useMemo(() => (session?.questionIds || []).map((id) => questionMap.get(id)).filter((question): question is QuestionLibraryItem => Boolean(question)), [session, questionMap])
  const question = testQuestions[index]
  const category = categories.find((item) => item.name === session?.examName)
  const markingScheme = category?.markingScheme || DEFAULT_MARKING_SCHEME
  const mode = session?.mode || 'test'
  const sessionTitle = session?.kind === 'smart'
    ? 'Smart chapter test'
    : session?.kind === 'chapter-test'
      ? 'Chapter test'
      : session?.kind === 'subject-test'
        ? 'Subject-wise test'
        : session?.kind === 'full-test'
          ? 'Full test'
          : 'Mock test'
  const builderPath = session?.kind === 'smart' ? '/smart-test' : session?.kind && session.kind !== 'mock' ? '/tests' : '/mock-tests'
  const currentAnswer = question ? answers[question.id] || '' : ''
  const currentChecked = question ? practiceChecked.includes(question.id) : false
  const answeredIndices = new Set(testQuestions.map((item, itemIndex) => answers[item.id] ? itemIndex : -1).filter((itemIndex) => itemIndex >= 0))
  const reviewIndices = new Set(testQuestions.map((item, itemIndex) => reviewIds.includes(item.id) ? itemIndex : -1).filter((itemIndex) => itemIndex >= 0))
  const unvisitedIndices = new Set(testQuestions.map((item, itemIndex) => visitedIds.includes(item.id) ? -1 : itemIndex).filter((itemIndex) => itemIndex >= 0))

  const currentQuestionId = question?.id
  useEffect(() => {
    if (!currentQuestionId) return
    setVisitedIds((current) => current.includes(currentQuestionId) ? current : [...current, currentQuestionId])
  }, [currentQuestionId])

  useEffect(() => {
    if (!session || submitted) return
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1)
      if (mode === 'test') setSecondsLeft((value) => value === null ? value : Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [session, submitted, mode])

  useEffect(() => {
    if (session && mode === 'test' && secondsLeft === 0 && !submitted) submitRef.current()
  }, [session, mode, secondsLeft, submitted])

  useEffect(() => {
    if (!session) return
    const data: SavedMockProgress = { answers, reviewIds, visitedIds, submitted }
    try { window.localStorage.setItem(MOCK_PROGRESS_KEY, JSON.stringify(data)) } catch { /* keep the current session in memory */ }
  }, [session, answers, reviewIds, visitedIds, submitted])

  const submitTest = useCallback(() => {
    if (!session || submitted) return
    if (!recorded.current) {
      recorded.current = true
      if (mode === 'test') {
        testQuestions.forEach((item) => {
          const answer = answers[item.id]
          if (answer) study.recordAnswer(item, answer, Math.max(0, Math.round(elapsed / Math.max(testQuestions.length, 1))))
        })
      } else {
        testQuestions.forEach((item) => {
          const answer = answers[item.id]
          if (answer && !practiceChecked.includes(item.id)) study.recordAnswer(item, answer, 0)
        })
      }
    }
    setSubmitted(true)
  }, [session, submitted, mode, testQuestions, answers, study, elapsed, practiceChecked])
  submitRef.current = submitTest

  const score = useMemo(() => {
    let correct = 0
    let wrong = 0
    let attempted = 0
    testQuestions.forEach((item) => {
      const answer = answers[item.id]
      if (!answer) return
      attempted++
      if (isStudyAnswerCorrect(item, answer)) correct++
      else wrong++
    })
    return { correct, wrong, attempted, unattempted: Math.max(0, testQuestions.length - attempted), marks: correct * markingScheme.correct + wrong * markingScheme.incorrect }
  }, [testQuestions, answers, markingScheme])

  useEffect(() => {
    if (!session || !submitted || resultRecorded.current) return
    const resultId = String(session.createdAt)
    if (testResults.some((result) => result.id === resultId)) {
      resultRecorded.current = true
      return
    }
    resultRecorded.current = true
    recordTestResult({
      id: resultId,
      kind: session.kind || 'mock',
      examName: session.examName,
      mode,
      subjectName: session.subjectName,
      chapterName: session.chapterName,
      totalQuestions: testQuestions.length,
      attempted: score.attempted,
      correct: score.correct,
      wrong: score.wrong,
      unattempted: score.unattempted,
      marks: score.marks,
      maxMarks: testQuestions.length * markingScheme.correct,
      accuracy: score.attempted ? Math.round((score.correct / score.attempted) * 100) : 0,
      elapsedSeconds: elapsed,
      completedAt: Date.now(),
    })
  }, [session, submitted, mode, testQuestions.length, score, markingScheme, elapsed, recordTestResult, testResults])

  function goTo(nextIndex: number) {
    setIndex(Math.max(0, Math.min(testQuestions.length - 1, nextIndex)))
  }

  function clearResponse() {
    if (!question) return
    setAnswers((current) => { const next = { ...current }; delete next[question.id]; return next })
    setPracticeChecked((current) => current.filter((id) => id !== question.id))
  }

  function toggleReview() {
    if (!question) return
    setReviewIds((current) => current.includes(question.id) ? current.filter((id) => id !== question.id) : [...current, question.id])
  }

  function savePracticeAnswer() {
    if (!question || !currentAnswer || currentChecked) return
    study.recordAnswer(question, currentAnswer, 0)
    setPracticeChecked((current) => [...current, question.id])
  }

  function retake() {
    if (!session) return
    const nextSession = { ...session, createdAt: Date.now() }
    recorded.current = false
    resultRecorded.current = false
    setSession(nextSession)
    setAnswers({})
    setReviewIds([])
    setVisitedIds([])
    setPracticeChecked([])
    setIndex(0)
    setElapsed(0)
    setSecondsLeft(nextSession.durationSeconds)
    setSubmitted(false)
    try {
      window.localStorage.setItem(ACTIVE_MOCK_SESSION_KEY, JSON.stringify(nextSession))
      window.localStorage.removeItem(MOCK_PROGRESS_KEY)
    } catch { /* no-op */ }
  }

  if (loading || !study.hydrated) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-brand-600" /></div>

  if (!session || !testQuestions.length) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700"><AlertCircle size={24} /></span><h1 className="mt-4 font-display text-2xl font-bold text-ink-900">No active test found</h1><p className="mt-2 text-sm text-slate-500">Build a question set first. The session is saved in this browser while you work.</p><div className="mt-5 flex justify-center gap-2"><Link href="/tests" className="inline-flex rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white">Chapter test</Link><Link href="/mock-tests" className="inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-ink-700">Mock test</Link></div></div>

  if (submitted) {
    const subjectMarks = new Map<string, { correct: number; wrong: number; marks: number }>()
    testQuestions.forEach((item) => {
      const current = subjectMarks.get(item.subjectName) || { correct: 0, wrong: 0, marks: 0 }
      const answer = answers[item.id]
      if (answer && isStudyAnswerCorrect(item, answer)) { current.correct++; current.marks += markingScheme.correct }
      else if (answer) { current.wrong++; current.marks += markingScheme.incorrect }
      subjectMarks.set(item.subjectName, current)
    })
    const accuracy = score.attempted ? Math.round((score.correct / score.attempted) * 100) : 0
    return (
      <div className="mx-auto max-w-6xl px-4 py-7 pb-20 sm:py-10">
        <div className="rounded-3xl bg-gradient-to-br from-[#0f766e] to-[#39b98f] p-6 text-white shadow-card sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{sessionTitle} · {session.examName}</span><h1 className="mt-3 font-display text-3xl font-extrabold">{session.kind === 'smart' ? 'Smart test complete' : 'Test complete'}</h1><p className="mt-1 text-sm text-white/90">{session.subjectName && session.chapterName ? `${session.subjectName} · ${session.chapterName} · ` : ''}{mode === 'test' ? 'Timed test finished.' : 'Practice session finished.'} Review your answers and use any mistakes for another chapter-wise round.</p></div><div className="grid h-24 w-24 place-items-center rounded-full border-4 border-white/25 bg-white/10 text-center"><div><p className="font-display text-2xl font-extrabold">{score.marks}</p><p className="text-[10px] text-blue-100">marks</p></div></div></div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><ResultMetric label="Correct" value={score.correct} tone="green" /><ResultMetric label="Incorrect" value={score.wrong} tone="rose" /><ResultMetric label="Unattempted" value={score.unattempted} tone="slate" /><ResultMetric label="Accuracy" value={`${accuracy}%`} tone="blue" /></div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-blue-100"><span>Time taken: {formatTime(elapsed)}</span><span>Marking: +{markingScheme.correct} / {markingScheme.incorrect} / {markingScheme.unattempted}</span><span>Attempted: {score.attempted}/{testQuestions.length}</span></div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><h2 className="font-display text-base font-bold text-ink-900">Subject score breakdown</h2><div className="mt-3 space-y-2">{Array.from(subjectMarks.entries()).map(([name, value]) => <div key={name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"><div><p className="text-sm font-bold text-ink-900">{name}</p><p className="text-xs text-slate-500">{value.correct} correct · {value.wrong} incorrect</p></div><span className="font-display text-lg font-bold text-brand-700">{value.marks}</span></div>)}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><h2 className="font-display text-base font-bold text-ink-900">Your next action</h2><p className="mt-2 text-sm leading-6 text-slate-500">{score.wrong ? `${score.wrong} incorrect response${score.wrong === 1 ? '' : 's'} have been added to your Mistake Book. Revisit them before another full set.` : 'No incorrect answers in this set. Keep your streak going with another focused session.'}</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/mistakes" className="rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-bold text-white">Open mistake book</Link><Link href={builderPath} className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-bold text-ink-700">Another {sessionTitle.toLowerCase()}</Link><button onClick={retake} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-bold text-ink-700"><RotateCcw size={13} /> Retake</button></div></div>
        </div>
        <div className="mt-7"><h2 className="font-display text-xl font-bold text-ink-900">Solutions review</h2><p className="mt-1 text-sm text-slate-500">Correct answers and detailed solutions are shown only after submission in timed mode.</p><div className="mt-4 space-y-3">{testQuestions.map((item, itemIndex) => {
          const answer = answers[item.id]
          const isCorrect = Boolean(answer && isStudyAnswerCorrect(item, answer))
          return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"><div className="flex flex-wrap items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-bold ${!answer ? 'bg-slate-100 text-slate-500' : isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{itemIndex + 1}</span><span className="text-xs font-bold text-ink-900">{item.subjectName} · {item.chapterName}</span><span className="text-xs text-slate-400">{item.year} · {item.shift}</span><span className="ml-auto"><DifficultyBadge difficulty={item.difficulty} /></span></div><div className="mt-3 text-sm leading-6 text-ink-900"><MathText text={item.text} /></div><div className="mt-2 flex flex-wrap gap-3 text-xs"><span className={isCorrect ? 'font-bold text-emerald-700' : 'text-rose-700'}>Your response: {answer || 'Unattempted'}</span><span className="font-bold text-emerald-700">Correct answer: {item.questionType === 'numerical' ? item.correctAnswer : item.correctOptionId}</span></div><div className="mt-3 rounded-xl bg-brand-50/60 p-3 text-sm leading-6 text-ink-800"><p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">Solution</p><MathText text={item.solution || 'No detailed solution was provided for this question.'} /></div></article>
        })}</div></div>
      </div>
    )
  }

  const selected = question ? answers[question.id] || '' : ''
  const isCorrect = question && selected ? isStudyAnswerCorrect(question, selected) : false
  const isMarked = question ? reviewIds.includes(question.id) : false

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><Link href={builderPath} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-700"><ChevronLeft size={14} /> Back to {sessionTitle.toLowerCase()}</Link><h1 className="mt-1 font-display text-xl font-bold text-ink-900">{session.subjectName && session.chapterName ? `${session.subjectName} · ${session.chapterName}` : session.examName} <span className="text-slate-400">·</span> {mode === 'test' ? 'Timed test' : 'Practice test'}</h1></div><div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold ${mode === 'test' && (secondsLeft || 0) < 300 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-ink-800'}`}><Timer size={17} />{mode === 'test' ? formatTime(secondsLeft ?? session.durationSeconds) : formatTime(elapsed)}</div></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0">
          {question && <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">Question {index + 1} of {testQuestions.length}</span><span className="text-xs text-slate-500">{question.subjectName} · {question.chapterName} · {question.year} {question.shift}</span><span className="ml-auto"><DifficultyBadge difficulty={question.difficulty} /></span></div><div className="mt-4 text-base leading-7 text-ink-900"><MathText text={question.text} /></div>{question.imageUrl && <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100 bg-slate-50 p-2"><img src={question.imageUrl} alt="Question diagram" className="max-h-72 max-w-full object-contain" /></div>}
            {question.questionType === 'numerical' ? <div className="mt-5"><label className="mb-1 block text-xs font-semibold text-slate-500">Numerical answer</label><input type="text" inputMode="decimal" value={selected} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} disabled={mode === 'practice' && currentChecked} placeholder="Enter your answer" className="w-full max-w-sm rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-brand-500" /></div> : <div className="mt-5 space-y-2">{question.options.map((option) => {const active = selected === option.id; return <button key={option.id} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm ${active ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:bg-slate-50'}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-500'}`}>{option.id}</span><span className="pt-0.5 text-ink-800">{option.imageUrl ? <img src={option.imageUrl} alt={`Option ${option.id}`} className="max-h-36 max-w-full object-contain" /> : <MathText text={option.text} />}</span></button>})}</div>}
            {mode === 'practice' && currentChecked && <div className={`mt-4 rounded-xl p-3 text-sm ${isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}><p className="font-bold">{isCorrect ? '🎉 Correct — brilliant work!' : 'That answer is not quite right. Review the solution and try a similar question next.'}</p><div className="mt-2 text-sm"><MathText text={question.solution} /></div></div>}
          </article>}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"><span className="mr-auto text-xs text-slate-500">{mode === 'test' ? 'Correct answers and solutions stay hidden until you submit.' : 'Practice mode gives immediate feedback after checking.'}</span><button onClick={toggleReview} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold ${isMarked ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600'}`}><Flag size={13} />{isMarked ? 'Marked for review' : 'Mark for review'}</button><button onClick={clearResponse} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><RotateCcw size={13} />Clear response</button>{mode === 'practice' && <button onClick={savePracticeAnswer} disabled={!selected || currentChecked} className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Check answer</button>}</div>
        </section>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-card lg:sticky lg:top-24"><div className="flex items-center justify-between"><h2 className="font-display text-sm font-bold text-ink-900">Question palette</h2><span className="text-xs text-slate-400">{answeredIndices.size}/{testQuestions.length}</span></div><QuestionNavigator total={testQuestions.length} currentIndex={index} answeredIndices={answeredIndices} bookmarkedIndices={reviewIndices} reviewIndices={reviewIndices} unvisitedIndices={unvisitedIndices} onSelect={goTo} /><div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500"><span>🟢 Answered</span><span>🔴 Not answered</span><span>🟣 Review</span><span>⚪ Not visited</span></div><div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-ink-800">Marking scheme</p><p className="mt-1 text-xs text-slate-500">+{markingScheme.correct} correct · {markingScheme.incorrect} incorrect · {markingScheme.unattempted} unattempted</p></div><button onClick={() => { if (confirm('Submit this test now? You can review solutions after submission.')) submitTest() }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900 py-3 text-sm font-bold text-white"><Send size={15} /> Submit test</button></aside>
      </div>
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3"><button onClick={() => goTo(index - 1)} disabled={index === 0} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-ink-700 disabled:opacity-40"><ChevronLeft size={16} />Prev</button><button onClick={clearResponse} className="hidden rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 sm:inline-flex">Clear</button><button onClick={() => { if (question) { toggleReview(); goTo(index + 1) } }} className="hidden rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-700 md:inline-flex">Mark &amp; Next</button><button onClick={() => goTo(index + 1)} disabled={index >= testQuestions.length - 1} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-40">Save &amp; Next <ChevronRight size={16} /></button><button onClick={submitTest} className="rounded-xl bg-ink-900 px-3 py-2.5 text-sm font-bold text-white">Submit</button></div></div>
    </div>
  )
}

function ResultMetric({ label, value, tone }: { label: string; value: string | number; tone: 'green' | 'rose' | 'slate' | 'blue' }) {
  const colors = { green: 'bg-emerald-400/15 text-emerald-100', rose: 'bg-rose-400/15 text-rose-100', slate: 'bg-white/10 text-blue-100', blue: 'bg-cyan-400/15 text-cyan-100' }
  return <div className={`rounded-xl p-3 ${colors[tone]}`}><p className="text-xs opacity-80">{label}</p><p className="mt-1 font-display text-2xl font-extrabold">{value}</p></div>
}
