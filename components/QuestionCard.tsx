'use client'

import clsx from 'clsx'
import { Bookmark, CheckCircle2, XCircle } from 'lucide-react'
import type { Question } from '@/data/mockData'
import DifficultyBadge from './DifficultyBadge'
import MathText from './MathText'
import SolutionText from './SolutionText'
import { isAnswerCorrect } from '@/lib/answers'

interface QuestionCardProps {
  question: Question & { chapterName?: string }
  selectedOptionId?: string
  showSolution: boolean
  isBookmarked: boolean
  onSelectOption: (optionId: string) => void
  onToggleBookmark: () => void
}

export default function QuestionCard({
  question,
  selectedOptionId,
  showSolution,
  isBookmarked,
  onSelectOption,
  onToggleBookmark,
}: QuestionCardProps) {
  return (
    <div className="rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-ink-800">Q{question.number}</span>
        <span className="h-1 w-1 rounded-full bg-slate-300" />
        <span>{question.examType}</span>
        <span className="h-1 w-1 rounded-full bg-slate-300" />
        <span>{question.year}</span>
        <span className="h-1 w-1 rounded-full bg-slate-300" />
        <span>{question.shift}</span>
        <span className="ml-auto">
          <DifficultyBadge difficulty={question.difficulty} />
        </span>
      </div>

      <MathText as="p" text={question.text} className="text-[15px] leading-relaxed text-ink-900" />
      {(question.topic || question.roiTag) && <div className="mt-2 flex flex-wrap gap-2">{question.topic && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Topic: {question.topic}</span>}{question.roiTag && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">⚡ {question.roiTag}</span>}</div>}

      {question.imageUrl && (
        // Natural aspect ratio (not a fixed 16:9 box) so exported question
        // images — which are often very wide or very tall — stay readable
        // instead of being shrunk into a letterboxed strip.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.imageUrl}
          alt={'Question ' + question.number}
          loading="lazy"
          className="mt-3 w-full rounded-lg border border-slate-100 bg-white object-contain"
        />
      )}

      {question.questionType === 'numerical' ? (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-slate-500">Enter your answer</label>
          <input
            type="text"
            inputMode="decimal"
            value={selectedOptionId || ''}
            disabled={showSolution}
            onChange={(e) => !showSolution && onSelectOption(e.target.value)}
            placeholder="e.g. 3.5"
            className={clsx(
              'w-full rounded-xl border p-3 text-sm text-ink-900',
              !showSolution && 'border-slate-200 focus:border-brand-500 focus:outline-none',
              showSolution && isAnswerCorrect(question, selectedOptionId) && 'border-easy bg-green-50',
              showSolution && !isAnswerCorrect(question, selectedOptionId) && 'border-difficult bg-red-50'
            )}
          />
          {showSolution && (
            <p
              className={clsx(
                'mt-2 flex items-center gap-1.5 text-sm font-semibold',
                isAnswerCorrect(question, selectedOptionId) ? 'text-easy' : 'text-difficult'
              )}
            >
              {isAnswerCorrect(question, selectedOptionId) ? (
                <CheckCircle2 size={16} />
              ) : (
                <XCircle size={16} />
              )}
              {isAnswerCorrect(question, selectedOptionId)
                ? 'Correct'
                : 'Correct answer: ' + question.correctAnswer}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {question.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id
            const isCorrect = opt.id === question.correctOptionId
            const revealCorrect = showSolution && isCorrect
            const revealWrong = showSolution && isSelected && !isCorrect

            return (
              <button
                key={opt.id}
                onClick={() => !showSolution && onSelectOption(opt.id)}
                disabled={showSolution}
                className={clsx(
                  'flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition',
                  !showSolution && isSelected && 'border-brand-500 bg-brand-50 ring-1 ring-brand-500',
                  !showSolution && !isSelected && 'border-slate-200 hover:border-brand-200 hover:bg-slate-50',
                  revealCorrect && 'border-easy bg-green-50',
                  revealWrong && 'border-difficult bg-red-50',
                  showSolution && !revealCorrect && !revealWrong && 'border-slate-200 opacity-70'
                )}
              >
                <span
                  className={clsx(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                    !showSolution && isSelected && 'border-brand-600 bg-brand-600 text-white',
                    !showSolution && !isSelected && 'border-slate-300 text-slate-500',
                    revealCorrect && 'border-easy bg-easy text-white',
                    revealWrong && 'border-difficult bg-difficult text-white',
                    showSolution && !revealCorrect && !revealWrong && 'border-slate-300 text-slate-400'
                  )}
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
                  <MathText as="span" text={opt.text} className="pt-0.5 text-ink-800" />
                )}
                {revealCorrect && <CheckCircle2 size={16} className="ml-auto shrink-0 text-easy" />}
                {revealWrong && <XCircle size={16} className="ml-auto shrink-0 text-difficult" />}
              </button>
            )
          })}
        </div>
      )}

      {showSolution && (
        <div className="mt-4 rounded-2xl bg-brand-50/50 p-3.5 ring-1 ring-brand-100">
          <SolutionText text={question.solution} />
          {question.solutionImageUrl && <img src={question.solutionImageUrl} alt={`Solution for question ${question.number}`} className="mt-3 max-h-80 max-w-full rounded-lg border border-slate-100 object-contain" />}
        </div>
      )}

      <button
        onClick={onToggleBookmark}
        className={clsx(
          'mt-4 flex items-center gap-1.5 text-xs font-semibold',
          isBookmarked ? 'text-amber-600' : 'text-slate-400 hover:text-amber-600'
        )}
      >
        <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
        {isBookmarked ? (question.chapterName ? `Bookmarked · ${question.chapterName}` : 'Bookmarked') : 'Bookmark this question'}
      </button>
    </div>
  )
}