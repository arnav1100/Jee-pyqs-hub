import type { Difficulty } from '@/data/mockData'
import clsx from 'clsx'

const styles: Record<Difficulty, string> = {
  Easy: 'bg-easy text-white',
  Moderate: 'bg-moderate text-white',
  Difficult: 'bg-difficult text-white',
}

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold',
        styles[difficulty]
      )}
    >
      {difficulty}
    </span>
  )
}