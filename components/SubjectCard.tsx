import Link from 'next/link'
import { ArrowRight, Atom, FlaskConical, Sigma, BookOpen } from 'lucide-react'
import type { SubjectDoc } from '@/lib/content'

const icons: Record<string, typeof Atom> = {
  physics: Atom,
  chemistry: FlaskConical,
  mathematics: Sigma,
}

export default function SubjectCard({ subject }: { subject: SubjectDoc }) {
  const Icon = icons[subject.slug] || BookOpen

  return (
    <Link
      href={`/${subject.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl2 border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 transition group-hover:opacity-20"
        style={{ background: `linear-gradient(135deg, ${subject.colorFrom}, ${subject.colorTo})` }}
      />
      <div
        className="mb-4 grid h-11 w-11 place-items-center rounded-xl text-white"
        style={{ background: `linear-gradient(135deg, ${subject.colorFrom}, ${subject.colorTo})` }}
      >
        <Icon size={22} />
      </div>

      <h3 className="font-display text-lg font-bold text-ink-900">{subject.name}</h3>

      <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
        <span>
          <strong className="font-semibold text-ink-800">{subject.totalChapters}</strong> Chapters
        </span>
        <span className="h-1 w-1 rounded-full bg-slate-300" />
        <span>
          <strong className="font-semibold text-ink-800">{subject.totalQuestions.toLocaleString()}</strong> Questions
        </span>
      </div>

      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
        Explore Chapters
        <ArrowRight size={15} className="transition group-hover:translate-x-1" />
      </span>
    </Link>
  )
}
