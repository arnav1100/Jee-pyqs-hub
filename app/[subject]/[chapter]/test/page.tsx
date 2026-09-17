'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Timer, CheckCircle2, XCircle, RotateCcw, Loader2 } from 'lucide-react'
import { useSubjects, useChapters, useQuestions } from '@/lib/content'
import { isAnswerCorrect } from '@/lib/answers'
import QuestionNavigator from '@/components/QuestionNavigator'
import DifficultyBadge from '@/components/DifficultyBadge'
import PremiumGate from '@/components/PremiumGate'
import MathText from '@/components/MathText'
import { useAuth } from '@/lib/auth-context'
import { recordAttempt } from '@/lib/stats'

const SECONDS_PER_QUESTION = 90

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function TestPage() {
  return (
    <PremiumGate>
      <TestPageContent />
    </PremiumGate>
  )
}

function TestPageContent() {
  const params = useParams<{ subject: string; chapter: string }>()
  const { subjects, loading: subjectsLoading } = useSubjects()

  const subject = useMemo(
    () => subjects.find((s) => s.slug === params.subject),
    [subjects, params.subject]
  )

  const { chapters, loading: chaptersLoading } = useChapters(subject)

  const chapter = useMemo(
    () => chapters.find((c) => c.slug === params.chapter),
    [chapters, params.chapter]
  )

  const { questions: chapterQuestions, loading: questionsLoading } = useQuestions(subject, chapter)

  const { user } = useAuth()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const recordedRef = useRef(false)

  // Persist the attempt (score, correct/wrong counts) once per submission,
  // and mark the chapter as completed on the user's progress doc — see
  // lib/stats.ts#recordAttempt. Guarded so a re-render doesn't double-write,
  // and reset on Retake (setSubmitted(false)) further down.
  useEffect(() => {
    if (!submitted || !user || !subject || !chapter || chapterQuestions.length === 0) return
    if (recordedRef.current) return
    recordedRef.current = true

    const correct = chapterQuestions.filter((q) => isAnswerCorrect(q, answers[q.id])).length
    const attemptedTotal = chapterQuestions.filter((q) => Boolean(answers[q.id])).length
    const wrong = attemptedTotal - correct
    const scorePct = Math.round((correct / chapterQuestions.length) * 100)

    recordAttempt(user.uid, {
      subjectSlug: subject.slug,
      chapterSlug: chapter.slug,
      chapterName: chapter.name,
      total: chapterQuestions.length,
      correct,
      wrong,
      scorePct,
    }).catch(() => {})
  }, [submitted, user, subject, chapter, chapterQuestions, answers])

  // Initialize the countdown once questions have loaded.
  useEffect(() => {
    if (!questionsLoading && chapterQuestions.length > 0 && secondsLeft === null) {
      setSecondsLeft(chapterQuestions.length * SECONDS_PER_QUESTION)
    }
  }, [questionsLoading, chapterQuestions.length, secondsLeft])

  useEffect(() => {
    if (submitted || secondsLeft === null) return
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null) return s
        if (s <= 1) {
          setSubmitted(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [submitted, secondsLeft === null])

  const structureLoading = subjectsLoading || (Boolean(subject) && chaptersLoading)
  const notFoundYet = !structureLoading && (!subject || !chapter)

  if (notFoundYet) notFound()

  if (structureLoading || !subject || !chapter) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-slate-300" size={28} />
      </div>
    )
  }

  if (questionsLoading || secondsLeft === null) {
    if (!questionsLoading && chapterQuestions.length === 0) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-sm text-slate-500">No questions available for this chapter yet.</p>
          <Link href={`/${subject.slug}/${chapter.slug}`} className="mt-4 inline-block text-sm font-semibold text-brand-600">
            Back to chapter
          </Link>
        </div>
      )
    }
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-slate-300" size={28} />
      </div>
    )
  }

  const question = chapterQuestions[Math.min(index, chapterQuestions.length - 1)]
  const answeredIndices = new Set(chapterQuestions.map((q, i) => (answers[q.id] ? i : -1)).filter((i) => i >= 0))

  if (submitted) {
    const correctCount = chapterQuestions.filter((q) => isAnswerCorrect(q, answers[q.id])).length
    const scorePct = Math.round((correctCount / chapterQuestions.length) * 100)

    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
          <span className="font-display text-xl font-bold">{scorePct}%</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Test complete</h1>
        <p className="mt-1 text-sm text-slate-500">
          {correctCount} of {chapterQuestions.length} correct in {chapter.name}
        </p>

        <div className="mt-6 space-y-2 text-left">
          {chapterQuestions.map((q, i) => {
            const isCorrect = isAnswerCorrect(q, answers[q.id])
            const attempted = Boolean(answers[q.id])
            return (
              <div key={q.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                {attempted ? (
                  isCorrect ? (
                    <CheckCircle2 size={18} className="shrink-0 text-easy" />
                  ) : (
                    <XCircle size={18} className="shrink-0 text-difficult" />
                  )
                ) : (
                  <span className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-slate-200" />
                )}
                <span className="flex-1 truncate text-sm text-ink-800">
                  Q{q.number}. <MathText text={q.text} />
                </span>
                <DifficultyBadge difficulty={q.difficulty} />
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              setAnswers({})
              setSecondsLeft(chapterQuestions.length * SECONDS_PER_QUESTION)
              setIndex(0)
              setSubmitted(false)
              recordedRef.current = false
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-700"
          >
            <RotateCcw size={15} /> Retake
          </button>
          <Link
            href={`/${subject.slug}/${chapter.slug}`}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to chapter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-28">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between px-4 pt-3">
            <span className="text-xs font-semibold text-ink-800">{chapter.name} · Test</span>
            <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-difficult">
              <Timer size={13} /> {formatTime(secondsLeft)}
            </span>
          </div>
          <QuestionNavigator
            total={chapterQuestions.length}
            currentIndex={index}
            answeredIndices={answeredIndices}
            bookmarkedIndices={new Set()}
            onSelect={setIndex}
          />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-5">
        <div className="rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-ink-800">Q{question.number}</span>
            <DifficultyBadge difficulty={question.difficulty} />
          </div>
          <MathText as="p" text={question.text} className="text-[15px] leading-relaxed text-ink-900" />

          {question.questionType === 'numerical' ? (
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-slate-500">Enter your answer</label>
              <input
                type="text"
                inputMode="decimal"
                value={answers[question.id] || ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [question.id]: e.target.value }))}
                placeholder="e.g. 3.5"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {question.options.map((opt) => {
                const isSelected = answers[question.id] === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setAnswers((a) => ({ ...a, [question.id]: opt.id }))}
                    className={
                      'flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition ' +
                      (isSelected ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:bg-slate-50')
                    }
                  >
                    <span
                      className={
                        'grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold ' +
                        (isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-500')
                      }
                    >
                      {opt.id}
                    </span>
                    {opt.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={opt.imageUrl}
                        alt={'Option ' + opt.id}
                        className="max-h-40 w-auto max-w-full rounded-lg border border-slate-100 object-contain"
                      />
                    ) : (
                      <MathText as="span" text={opt.text} className="text-ink-800" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-ink-700 disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Prev
          </button>

          {index === chapterQuestions.length - 1 ? (
            <button
              onClick={() => setSubmitted(true)}
              className="flex flex-1 items-center justify-center rounded-xl bg-ink-900 py-2.5 text-sm font-semibold text-white"
            >
              Submit Test
            </button>
          ) : (
            <button
              onClick={() => setIndex((i) => Math.min(chapterQuestions.length - 1, i + 1))}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white"
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
