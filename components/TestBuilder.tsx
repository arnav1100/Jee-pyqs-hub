'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, ChevronRight, Layers, ListChecks, Loader2, Sparkles, Timer, BookOpen } from 'lucide-react'
import { useQuestionLibrary } from '@/lib/question-library'
import { useExamCatalog } from '@/lib/exam-catalog'
import { type MockSessionConfig, startMockSession } from '@/lib/mock-test-session'
import { CORE_SUBJECTS, displaySubject, sameChapter, sameSubject, subjectKey, uniqueChapters } from '@/lib/subject-utils'

const QUESTION_COUNTS = [5, 10, 15, 20, 30]
export type TestKind = 'chapter' | 'subject' | 'full'

const KIND_OPTIONS: Array<{ kind: TestKind; label: string; short: string; description: string; icon: typeof Layers }> = [
  { kind: 'chapter', label: 'Chapter test', short: 'Chapter', description: 'One subject, one chapter — a short focused test.', icon: BookOpen },
  { kind: 'subject', label: 'Subject-wise test', short: 'Subject', description: 'All chapters of Physics, Chemistry or Mathematics.', icon: ListChecks },
  { kind: 'full', label: 'Full test', short: 'Full', description: 'Mixed-subject paper covering everything loaded.', icon: Layers },
]

function isTestKind(value: string | null): value is TestKind {
  return value === 'chapter' || value === 'subject' || value === 'full'
}

export default function TestBuilder({ initialType = 'chapter' }: { initialType?: TestKind }) {
  const { questions, loading } = useQuestionLibrary()
  const { categories } = useExamCatalog()
  const router = useRouter()
  const [kind, setKind] = useState<TestKind>(initialType)
  const [exam, setExam] = useState('JEE Main')
  const [subject, setSubject] = useState('')
  const [chapter, setChapter] = useState('')
  const [count, setCount] = useState(10)
  const [mode, setMode] = useState<'practice' | 'test'>('test')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('type')
    if (isTestKind(requested)) setKind(requested)
    if (params.get('exam')) setExam(params.get('exam') || 'JEE Main')
    if (params.get('subject')) setSubject(displaySubject(params.get('subject') || ''))
    if (params.get('chapter')) setChapter(params.get('chapter') || '')
  }, [])

  const category = categories.find((item) => item.name === exam)
  const exams = useMemo(
    () => Array.from(new Set(['JEE Main', ...categories.map((item) => item.name), ...questions.map((item) => item.examType).filter(Boolean)])),
    [categories, questions]
  )

  // Subject buttons always offer the three core subjects, plus anything else in the library.
  const subjects = useMemo(() => {
    const map = new Map<string, string>()
    CORE_SUBJECTS.forEach((name) => map.set(subjectKey(name), name))
    ;[...(category?.subjects || []), ...questions.map((question) => question.subjectName)].forEach((name) => {
      const clean = displaySubject(name || '')
      if (clean && !map.has(subjectKey(clean))) map.set(subjectKey(clean), clean)
    })
    return [...map.values()]
  }, [category, questions])

  const examPool = useMemo(() => questions.filter((question) => question.examType === exam), [questions, exam])

  /** Questions of the selected subject, preferring the selected exam and falling back to all exams. */
  const subjectPool = useMemo(() => {
    if (!subject) return []
    const inExam = examPool.filter((question) => sameSubject(question.subjectName, subject))
    if (inExam.length) return inExam
    return questions.filter((question) => sameSubject(question.subjectName, subject))
  }, [examPool, questions, subject])

  const chapters = useMemo(() => uniqueChapters(subjectPool.map((question) => question.chapterName)), [subjectPool])

  const pool = useMemo(() => {
    if (kind === 'chapter') {
      if (!subject || !chapter) return []
      return subjectPool.filter((question) => sameChapter(question.chapterName, chapter))
    }
    if (kind === 'subject') return subjectPool
    if (examPool.length) return examPool
    return questions
  }, [kind, subject, chapter, subjectPool, examPool, questions])

  // Keep a selected chapter valid if the subject or kind changes.
  useEffect(() => {
    if (chapter && chapters.length && !chapters.some((name) => sameChapter(name, chapter))) setChapter('')
  }, [chapters, chapter])

  function chooseKind(next: TestKind) {
    setKind(next)
    setChapter('')
    if (next === 'full') setSubject('')
    if (typeof window !== 'undefined') window.history.replaceState(null, '', next === 'chapter' ? '/tests' : `/tests?type=${next}`)
  }

  function startSession() {
    if (!pool.length) return
    if (kind === 'chapter' && (!subject || !chapter)) return
    setStarting(true)
    const selected = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
    const session: MockSessionConfig = {
      questionIds: selected.map((question) => question.id),
      examName: exam,
      mode,
      durationSeconds: selected.length * 90,
      createdAt: Date.now(),
      kind: kind === 'chapter' ? 'chapter-test' : kind === 'subject' ? 'subject-test' : 'full-test',
      subjectName: kind === 'full' ? undefined : subject || undefined,
      chapterName: kind === 'chapter' ? chapter : undefined,
    }
    startMockSession(session)
    router.push('/mock-tests/session')
  }

  const activeKind = KIND_OPTIONS.find((item) => item.kind === kind) || KIND_OPTIONS[0]
  const maxQuestions = Math.min(count, pool.length)
  const canStart = pool.length > 0 && (kind !== 'chapter' || Boolean(subject && chapter))
  const examMismatch = Boolean(subject) && !examPool.some((question) => sameSubject(question.subjectName, subject)) && pool.length > 0

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-brand-600" /></div>

  return (
    <div className="mx-auto max-w-4xl px-4 py-7 pb-28 sm:py-10">
      <header className="rounded-3xl bg-gradient-to-br from-[#0f766e] via-[#159a87] to-[#39b98f] p-5 text-white shadow-card sm:p-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold"><Sparkles size={14} /> Simple setup · chapter-wise</span>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold">{activeKind.label}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/90">{activeKind.description}</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 text-center">
            <p className="text-[11px] font-semibold text-white/80">Questions available</p>
            <p className="mt-1 font-display text-2xl font-extrabold">{canStart ? pool.length : '—'}</p>
          </div>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-card">
        {KIND_OPTIONS.map(({ kind: value, short, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => chooseKind(value)}
            aria-pressed={kind === value}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-extrabold transition sm:text-sm ${kind === value ? 'bg-brand-700 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-brand-800'}`}
          >
            <Icon size={15} /> {short} test
          </button>
        ))}
      </div>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          {exams.length > 1 && (
            <Field label="Exam">
              <select value={exam} onChange={(event) => { setExam(event.target.value); setChapter('') }} className="admin-input">
                {exams.map((name) => <option key={name}>{name}</option>)}
              </select>
            </Field>
          )}

          {kind !== 'full' && (
            <div>
              <p className="mb-1.5 text-xs font-bold text-slate-600">Choose a subject</p>
              <div className="grid grid-cols-3 gap-2">
                {subjects.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={sameSubject(subject, name)}
                    onClick={() => { setSubject(name); setChapter('') }}
                    className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-extrabold transition sm:text-sm ${sameSubject(subject, name) ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-100' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-emerald-50'}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {kind === 'chapter' && (
            <Field label="Chapter">
              <select value={chapter} disabled={!subject} onChange={(event) => setChapter(event.target.value)} className="admin-input disabled:cursor-not-allowed disabled:opacity-50">
                <option value="">Choose a chapter</option>
                {chapters.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              {subject && !chapters.length && <p className="mt-1 text-xs text-amber-700">No {subject} questions are loaded on this device yet. Add them from the Admin panel, then reload.</p>}
            </Field>
          )}

          <Field label="Number of questions">
            <div className="flex flex-wrap gap-2">
              {QUESTION_COUNTS.map((value) => (
                <button key={value} type="button" onClick={() => setCount(value)} className={`rounded-xl border px-3.5 py-2 text-sm font-bold transition ${count === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'}`}>{value}</button>
              ))}
            </div>
          </Field>
        </div>

        {examMismatch && (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            No {subject} questions are tagged “{exam}”, so this test uses {subject} questions from every exam in your library.
          </p>
        )}

        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-ink-800">How do you want to practice?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeChoice selected={mode === 'test'} onClick={() => setMode('test')} title="Timed test" description="Answers and solutions appear after you submit." />
            <ModeChoice selected={mode === 'practice'} onClick={() => setMode('practice')} title="Practice mode" description="Check each answer and learn as you go." />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-700"><Timer size={19} /></span>
            <div>
              <p className="text-sm font-bold text-ink-900">
                {canStart
                  ? `${maxQuestions} questions · about ${Math.ceil(maxQuestions * 1.5)} minutes`
                  : kind === 'chapter'
                    ? 'Choose a subject and chapter to begin'
                    : 'No questions loaded yet for this choice'}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {kind === 'subject' ? `${subject || 'Subject'} · all chapters` : kind === 'full' ? 'All subjects mixed together' : 'Your answers and mistakes are saved as you study.'}
              </p>
            </div>
          </div>
          <button onClick={startSession} disabled={!canStart || starting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40">
            {starting ? 'Preparing…' : 'Start test'} <ChevronRight size={16} />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Need a paper built from your own mistakes? Try <LinkText href="/smart-test">Smart test</LinkText>. Want a full-length exam simulation? Open <LinkText href="/mock-tests">Mock test</LinkText>.
        </p>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>
}

function ModeChoice({ selected, onClick, title, description }: { selected: boolean; onClick: () => void; title: string; description: string }) {
  return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 hover:border-brand-200'}`}><span className="flex items-center justify-between gap-3"><span className="font-display text-sm font-bold text-ink-900">{title}</span><span className={`grid h-5 w-5 place-items-center rounded-full border ${selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'}`}>{selected && <Check size={12} />}</span></span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></button>
}

function LinkText({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="font-bold text-brand-700 underline decoration-brand-200 underline-offset-2">{children}</Link>
}
