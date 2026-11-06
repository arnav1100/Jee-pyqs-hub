'use client'

import { useEffect } from 'react'
import clsx from 'clsx'
import { Bookmark, X } from 'lucide-react'

interface QuestionPaletteProps {
  total: number
  currentIndex: number
  answeredIndices: Set<number>
  bookmarkedIndices: Set<number>
  reviewIndices?: Set<number>
  unvisitedIndices?: Set<number>
  onSelect: (index: number) => void
  /** Mobile bottom-sheet visibility (desktop always shows the grid inline). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Shown above the grid, e.g. "Question palette". */
  title?: string
}

function Legend() {
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-500">
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-brand-600" /> Current</span>
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Answered</span>
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-300" /> Not answered</span>
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-violet-400" /> Marked</span>
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-200" /> Not visited</span>
    </div>
  )
}

/**
 * Responsive question palette.
 *
 * - Desktop/tablet: a normal wrapped grid (never a horizontal strip, so the
 *   page itself can never be dragged sideways while browsing questions).
 * - Mobile: a bottom sheet with a scrollable wrapped grid, opened from the
 *   parent's own "Palette" button. The sheet is `overflow-y-auto` +
 *   `overscroll-contain`, so swiping inside it never pans the page.
 */
export default function QuestionPalette({
  total,
  currentIndex,
  answeredIndices,
  bookmarkedIndices,
  reviewIndices = new Set(),
  unvisitedIndices = new Set(),
  onSelect,
  open = false,
  onOpenChange,
  title = 'Question palette',
}: QuestionPaletteProps) {
  // Lock page scroll while the mobile sheet is open.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange?.(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const grid = (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-6" role="list">
      {Array.from({ length: total }).map((_, i) => {
        const isCurrent = i === currentIndex
        const isAnswered = answeredIndices.has(i)
        const isBookmarked = bookmarkedIndices.has(i)
        const isReview = reviewIndices.has(i)
        const isUnvisited = unvisitedIndices.has(i)

        return (
          <button
            key={i}
            type="button"
            role="listitem"
            onClick={() => {
              onSelect(i)
              onOpenChange?.(false)
            }}
            className={clsx(
              'relative grid aspect-square w-full place-items-center rounded-lg text-xs font-bold ring-2 transition',
              isCurrent && 'bg-brand-600 text-white ring-brand-600',
              !isCurrent && isReview && 'bg-violet-50 text-violet-700 ring-violet-300',
              !isCurrent && !isReview && isAnswered && 'bg-green-50 text-easy ring-easy/40',
              !isCurrent && !isReview && !isAnswered && !isUnvisited && 'bg-rose-50 text-rose-700 ring-rose-200',
              !isCurrent && isUnvisited && 'bg-white text-slate-400 ring-slate-200'
            )}
            aria-label={`Question ${i + 1}${isAnswered ? ', answered' : ', unattempted'}${isBookmarked ? ', marked' : ''}`}
            aria-current={isCurrent ? 'true' : undefined}
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

  return (
    <>
      {/* Inline grid — desktop / tablet (and any place that wants it in-flow). */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-ink-900">{title}</h2>
          <span className="text-xs text-slate-400">
            {answeredIndices.size}/{total}
          </span>
        </div>
        <div className="mt-3">{grid}</div>
        <Legend />
      </div>

      {/* Mobile bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-[60] sm:hidden" role="dialog" aria-modal="true" aria-label={title}>
          <button
            type="button"
            aria-label="Close palette"
            onClick={() => onOpenChange?.(false)}
            className="absolute inset-0 h-full w-full bg-ink-900/45 backdrop-blur-sm"
          />
          <div className="safe-bottom absolute inset-x-0 bottom-0 max-h-[72vh] overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-ink-900">{title}</h2>
                <p className="text-xs text-slate-500">
                  {answeredIndices.size} of {total} answered
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange?.(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-900"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {grid}
            <Legend />
            <button
              type="button"
              onClick={() => onOpenChange?.(false)}
              className="mt-4 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-ink-800"
            >
              Back to question
            </button>
          </div>
        </div>
      )}
    </>
  )
}
