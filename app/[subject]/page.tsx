'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { ChevronLeft, Loader2 } from 'lucide-react'
import ChapterCard from '@/components/ChapterCard'
import { useSubjects, useChapters } from '@/lib/content'

export default function ChaptersPage() {
  const params = useParams<{ subject: string }>()
  const { subjects, loading: subjectsLoading } = useSubjects()

  const subject = useMemo(
    () => subjects.find((s) => s.slug === params.subject),
    [subjects, params.subject]
  )

  const { chapters, loading: chaptersLoading } = useChapters(subject)

  if (!subjectsLoading && !subject) notFound()

  if (subjectsLoading || !subject) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-slate-300" size={28} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/" className="mb-4 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-600">
        <ChevronLeft size={16} /> All subjects
      </Link>

      <h1 className="font-display text-2xl font-bold text-ink-900">{subject.name} Chapters</h1>
      <p className="mt-1 text-sm text-slate-500">
        {chapters.length} of {subject.totalChapters} chapters shown · admins can add more anytime
      </p>

      {chaptersLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-slate-300" size={28} />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {chapters.map((chapter, i) => (
            <ChapterCard key={chapter.id} chapter={chapter} subjectSlug={subject.slug} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
