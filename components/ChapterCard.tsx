import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ChapterDoc } from '@/lib/content'

export default function ChapterCard({
  chapter,
  subjectSlug,
  index,
}: {
  chapter: ChapterDoc
  subjectSlug: string
  index: number
}) {
  return (
    <Link
      href={`/${subjectSlug}/${chapter.slug}`}
      className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-brand-200 hover:bg-brand-50/40"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 font-display text-sm font-bold text-slate-500">
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-ink-900">{chapter.name}</h3>
        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
          <span>{chapter.totalQuestions} Qs</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-easy" /> {chapter.easy}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-moderate" /> {chapter.moderate}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-difficult" /> {chapter.difficult}
          </span>
        </div>
      </div>

      <ChevronRight size={18} className="shrink-0 text-slate-300" />
    </Link>
  )
}
