'use client'

import clsx from 'clsx'
import { Bookmark } from 'lucide-react'

interface QuestionNavigatorProps {
  total: number
  currentIndex: number
  answeredIndices: Set<number>
  bookmarkedIndices: Set<number>
  reviewIndices?: Set<number>
  unvisitedIndices?: Set<number>
  onSelect: (index: number) => void
}

export default function QuestionNavigator({
  total,
  currentIndex,
  answeredIndices,
  bookmarkedIndices,
  reviewIndices = new Set(),
  unvisitedIndices = new Set(),
  onSelect,
}: QuestionNavigatorProps) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
      {Array.from({ length: total }).map((_, i) => {
        const isCurrent = i === currentIndex
        const isAnswered = answeredIndices.has(i)
        const isBookmarked = bookmarkedIndices.has(i)
        const isReview = reviewIndices.has(i)
        const isUnvisited = unvisitedIndices.has(i)

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={clsx(
              'relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ring-2 transition',
              isCurrent && 'ring-brand-600 bg-brand-600 text-white',
              !isCurrent && isReview && 'ring-violet-300 bg-violet-50 text-violet-700',
              !isCurrent && !isReview && isAnswered && 'ring-easy/40 bg-green-50 text-easy',
              !isCurrent && !isReview && !isAnswered && !isUnvisited && 'ring-rose-200 bg-rose-50 text-rose-700',
              !isCurrent && isUnvisited && 'ring-slate-200 bg-white text-slate-400'
            )}
            aria-label={`Question ${i + 1}${isAnswered ? ', answered' : ', unattempted'}${isBookmarked ? ', bookmarked' : ''}`}
            aria-current={isCurrent}
          >
            {i + 1}
            {isBookmarked && (
              <Bookmark
                size={10}
                className={clsx('absolute -right-1 -top-1 rounded-full', isCurrent ? 'text-brand-600' : 'text-amber-500')}
                fill="currentColor"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
