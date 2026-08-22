'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { ChevronLeft, PenLine, Timer, Loader2 } from 'lucide-react'
import { useSubjects, useChapters } from '@/lib/content'
import PremiumGate from '@/components/PremiumGate'

const statCards = [
  { key: 'totalQuestions', label: 'Total Questions', color: 'bg-brand-600' },
  { key: 'easy', label: 'Easy', color: 'bg-easy' },
  { key: 'moderate', label: 'Moderate', color: 'bg-moderate' },
  { key: 'difficult', label: 'Difficult', color: 'bg-difficult' },
] as const

export default function ChapterDashboard() {
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

  const loading = subjectsLoading || (Boolean(subject) && chaptersLoading)
  const notFoundYet = !loading && (!subject || !chapter)

  if (notFoundYet) notFound()

  if (loading || !subject || !chapter) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-slate-300" size={28} />
      </div>
    )
  }

  return (
    <PremiumGate>
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link
        href={`/${subject.slug}`}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-600"
      >
        <ChevronLeft size={16} /> {subject.name} chapters
      </Link>

      <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{subject.name}</span>
      <h1 className="font-display text-2xl font-bold text-ink-900">{chapter.name}</h1>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <span className={`mb-2 inline-block h-1.5 w-8 rounded-full ${s.color}`} />
            <div className="font-display text-2xl font-bold text-ink-900">{chapter[s.key]}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href={`/${subject.slug}/${chapter.slug}/practice`}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <PenLine size={18} /> Start Practice
        </Link>
        <Link
          href={`/${subject.slug}/${chapter.slug}/test`}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-brand-600 py-3.5 font-semibold text-brand-700 transition hover:bg-brand-50"
        >
          <Timer size={18} /> Take Test
        </Link>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Practice mode shows solutions instantly · Test mode is timed with results at the end
      </p>
    </div>
    </PremiumGate>
  )
}
