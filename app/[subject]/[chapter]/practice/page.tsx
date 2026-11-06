'use client'

import { useMemo, useState } from 'react'
import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Eye, Loader2, LayoutGrid, ChevronLeft as Back } from 'lucide-react'
import { useSubjects, useChapters, useQuestions } from '@/lib/content'
import { isAnswerCorrect } from '@/lib/answers'
import QuestionPalette from '@/components/QuestionPalette'
import QuestionCard from '@/components/QuestionCard'
import ProgressBar from '@/components/ProgressBar'
import { useProgress } from '@/lib/use-progress'
import { useStudyData } from '@/lib/study-data'
import PremiumGate from '@/components/PremiumGate'

export default function PracticePage() {
  return (
    <PremiumGate>
      <PracticePageContent />
    </PremiumGate>
  )
}

function PracticePageContent() {
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

  const { progress, save, hydrated } = useProgress(params.chapter)
  const study = useStudyData()
  const [index, setIndex] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [recordedAnswers, setRecordedAnswers] = useState<Record<string, string>>({})

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

  if (questionsLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-slate-300" size={28} />
      </div>
    )
  }

  if (chapterQuestions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-slate-500">
          No questions have been added to this chapter yet — the admin panel will populate this from Firestore.
        </p>
        <Link href={`/${subject.slug}/${chapter.slug}`} className="mt-4 inline-block text-sm font-semibold text-brand-600">
          Back to chapter
        </Link>
      </div>
    )
  }

  const question = chapterQuestions[Math.min(index, chapterQuestions.length - 1)]
  const answeredIndices = new Set(
    chapterQuestions.map((q, i) => (progress.answers[q.id] ? i : -1)).filter((i) => i >= 0)
  )
  const bookmarkedIndices = new Set(
    chapterQuestions.map((q, i) => (progress.bookmarked.includes(q.id) ? i : -1)).filter((i) => i >= 0)
  )

  function goTo(i: number) {
    setIndex(Math.max(0, Math.min(chapterQuestions.length - 1, i)))
    setShowSolution(false)
    save((prev) => ({ ...prev, lastQuestionIndex: i }))
  }

  function selectOption(optionId: string) {
    save((prev) => {
      const answers = { ...prev.answers, [question.id]: optionId }
      // Recompute attempted/correct/wrong against the full question set so
      // the "My Progress" dashboard (lib/stats.ts) stays accurate — see
      // README for the users/{uid}/progress schema.
      let correctCount = 0
      let wrongCount = 0
      chapterQuestions.forEach((q) => {
        const given = answers[q.id]
        if (!given) return
        if (isAnswerCorrect(q, given)) correctCount += 1
        else wrongCount += 1
      })
      return {
        ...prev,
        answers,
        attemptedCount: Object.keys(answers).length,
        correctCount,
        wrongCount,
      }
    })
  }

  function toggleBookmark() {
    save((prev) => {
      const isBookmarked = prev.bookmarked.includes(question.id)
      return {
        ...prev,
        bookmarked: isBookmarked ? prev.bookmarked.filter((id) => id !== question.id) : [...prev.bookmarked, question.id],
      }
    })
    study.toggleBookmark(question.id)
  }

  function toggleSolution() {
    const answer = progress.answers[question.id]
    if (!showSolution && answer && recordedAnswers[question.id] !== answer) {
      study.recordAnswer({
        ...question,
        subjectId: subject?.id || params.subject,
        subjectSlug: subject?.slug || params.subject,
        subjectName: subject?.name || params.subject,
        chapterName: chapter?.name || params.chapter,
        source: question.source === 'firestore' ? 'firestore' : 'sample',
      }, answer, 0)
      setRecordedAnswers((current) => ({ ...current, [question.id]: answer }))
    }
    setShowSolution((current) => !current)
  }

  return (
    <div className="pb-28">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3">
            <Link
              href={`/${subject.slug}/${chapter.slug}`}
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-600"
            >
              <Back size={14} /> Exit
            </Link>
            <span className="min-w-0 truncate text-xs font-semibold text-ink-800">{chapter.name}</span>
            <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
              {index + 1}/{chapterQuestions.length}
            </span>
          </div>
          <div className="px-4 pb-3">
            <ProgressBar value={answeredIndices.size} total={chapterQuestions.length} />
          </div>
          <QuestionPalette
            total={chapterQuestions.length}
            currentIndex={index}
            answeredIndices={answeredIndices}
            bookmarkedIndices={bookmarkedIndices}
            onSelect={goTo}
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            title="Question palette"
          />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-5">
        {hydrated && (
          <QuestionCard
            question={question}
            selectedOptionId={progress.answers[question.id]}
            showSolution={showSolution}
            isBookmarked={progress.bookmarked.includes(question.id)}
            onSelectOption={selectOption}
            onToggleBookmark={toggleBookmark}
          />
        )}
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-1.5 px-3 py-2.5 sm:gap-2 sm:px-4 sm:py-3">
          <button
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label="Previous question"
            className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-2.5 text-sm font-semibold text-ink-700 disabled:opacity-40 sm:px-3"
          >
            <ChevronLeft size={16} /> <span className="hidden sm:inline">Prev</span>
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Open question palette"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2.5 text-sm font-semibold text-ink-700 sm:hidden"
          >
            <LayoutGrid size={16} />
            <span className="text-xs font-bold">{answeredIndices.size}</span>
          </button>

          <button
            onClick={toggleSolution}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink-900 px-2 py-2.5 text-xs font-semibold text-white sm:text-sm"
          >
            <Eye size={15} className="shrink-0" />
            <span className="truncate">{showSolution ? 'Hide Solution' : 'Show Solution'}</span>
          </button>

          <button
            onClick={() => goTo(index + 1)}
            disabled={index === chapterQuestions.length - 1}
            aria-label="Next question"
            className="flex shrink-0 items-center gap-1 rounded-xl bg-brand-600 px-2.5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 sm:px-3"
          >
            <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
