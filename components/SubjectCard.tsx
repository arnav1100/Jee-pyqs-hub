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
      href={'/' + subject.slug}
      className="group relative flex flex-col overflow-hidden rounded-xl2 border-0 p-6 shadow-card transition hover:-translate-y-1 hover:shadow-lg"
      style={{ background: 'linear-gradient(160deg, ' + subject.colorFrom + '18, ' + subject.colorTo + '0D)' }}
    >
      <div
        className="mb-4 grid h-14 w-14 place-items-center rounded-2xl text-white shadow-md"
        style={{ background: 'linear-gradient(135deg, ' + subject.colorFrom + ', ' + subject.colorTo + ')' }}
      >
        <Icon size={26} />
      </div>

      <h3 className="font-display text-xl font-bold text-ink-900">{subject.name}</h3>

      <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
        <span>
          <strong className="font-bold text-ink-800">{subject.totalChapters}</strong> Chapters
        </span>
        <span className="h-1 w-1 rounded-full bg-slate-300" />
        <span>
          <strong className="font-bold text-ink-800">{subject.totalQuestions.toLocaleString()}</strong> Questions
        </span>
      </div>

      <span
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold"
        style={{ color: subject.colorTo }}
      >
        Explore Chapters
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </span>
    </Link>
  )
}