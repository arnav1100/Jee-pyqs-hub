'use client'

import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react'
import SubjectCard from '@/components/SubjectCard'
import { useSubjects } from '@/lib/content'

export default function HomePage() {
  const { subjects, loading } = useSubjects()

  const totalQuestions = subjects.reduce((sum, s) => sum + s.totalQuestions, 0)
  const totalChapters = subjects.reduce((sum, s) => sum + s.totalChapters, 0)

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-950 to-brand-700 px-4 pb-14 pt-10 text-white sm:pb-20 sm:pt-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px, 64px 64px',
          }}
        />
        <div className="relative mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-100 ring-1 ring-white/20">
            <Sparkles size={12} />
            {totalQuestions.toLocaleString()}+ PYQs, chapter-wise
          </span>
          <h1 className="mt-4 max-w-md font-display text-3xl font-extrabold leading-tight sm:max-w-lg sm:text-4xl">
            Master JEE with every question that's ever been asked.
          </h1>
          <p className="mt-3 max-w-md text-sm text-brand-100 sm:text-base">
            Practice JEE Main &amp; Advanced previous year questions, chapter by chapter — sorted by difficulty, with full solutions.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-brand-100 sm:text-sm">
            {['Chapter-wise practice', 'Timed mock tests', 'Auto-saved progress'].map((f) => (
              <span key={f} className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-brand-300" />
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900 sm:text-2xl">Choose a subject</h2>
            <p className="mt-1 text-sm text-slate-500">
              {totalChapters} chapters · {totalQuestions.toLocaleString()} previous year questions
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-slate-300" size={28} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
