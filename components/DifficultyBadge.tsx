import type { Difficulty } from '@/data/mockData'
import clsx from 'clsx'

const styles: Record<Difficulty, string> = {
  Easy: 'bg-green-50 text-easy ring-green-200',
  Moderate: 'bg-amber-50 text-moderate ring-amber-200',
  Difficult: 'bg-red-50 text-difficult ring-red-200',
}

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        styles[difficulty]
      )}
    >
      {difficulty}
    </span>
  )
}
