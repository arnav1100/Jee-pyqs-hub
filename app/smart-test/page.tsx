'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, BookOpen, Loader2, NotebookPen, Sparkles, Target } from 'lucide-react'
import { useQuestionLibrary } from '@/lib/question-library'
import { useExamCatalog } from '@/lib/exam-catalog'
import { useStudyData } from '@/lib/study-data'
import { startMockSession, type MockSessionConfig } from '@/lib/mock-test-session'
import { CORE_SUBJECTS, displaySubject, sameChapter, sameSubject, subjectKey, uniqueChapters } from '@/lib/subject-utils'
import PremiumGate from '@/components/PremiumGate'

const QUESTION_COUNTS = [5, 10, 15, 20]

export default function SmartTestPage() {
  return (
    <PremiumGate>
      <SmartTestBuilder />
    </PremiumGate>
  )
}

function SmartTestBuilder() {
  const { questions, loading } = useQuestionLibrary()
  const { categories } = useExamCatalog()
  const study = useStudyData()
  const router = useRouter()
  const [exam, setExam] = useState('JEE Main')
  const [subject, setSubject] = useState('')
  const [chapter, setChapter] = useState('')
  const [count, setCount] = useState(10)
  const [busy, setBusy] = useState(false)

  const category = categories.find((item) => item.name === exam)
  const examNames = useMemo(() => Array.from(new Set([...categories.map((item) => item.name), ...questions.map((item) => item.examType)])), [categories, questions])
  const examPool = useMemo(() => questions.filter((question) => question.examType === exam), [questions, exam])
  const subjectPool = useMemo(() => {
    if (!subject) return []
    const inExam = examPool.filter((question) => sameSubject(question.subjectName, subject))
    return inExam.length ? inExam : questions.filter((question) => sameSubject(question.subjectName, subject))
  }, [examPool, questions, subject])
  const chapterQuestions = useMemo(() => subjectPool.filter((question) => !chapter || sameChapter(question.chapterName, chapter)), [subjectPool, chapter])
  const subjects = useMemo(() => {
    const names = new Map<string, string>()
    CORE_SUBJECTS.forEach((name) => names.set(subjectKey(name), name))
    ;[...(category?.subjects || []), ...questions.map((question) => question.subjectName)].forEach((name) => {
      const clean = displaySubject(name || '')
      if (clean && !names.has(subjectKey(clean))) names.set(subjectKey(clean), clean)
    })
    return Array.from(names.values())
  }, [category, questions])
  const chapters = useMemo(() => uniqueChapters(subjectPool.map((question) => question.chapterName)), [subjectPool])
  const attemptedIds = useMemo(() => new Set(study.attempts.map((attempt) => attempt.questionId)), [study.attempts])
  const previousWrong = chapterQuestions.filter((question) => Boolean(study.mistakes[question.id]))
  const newQuestions = chapterQuestions.filter((question) => !attemptedIds.has(question.id) && !study.mistakes[question.id])

  function buildTest() {
    if (!subject || !chapter || !chapterQuestions.length) return
    setBusy(true)
    const total = Math.min(count, chapterQuestions.length)
    const selected = new Map<string, (typeof chapterQuestions)[number]>()
    const takeRandom = (pool: typeof chapterQuestions, limit: number) => {
      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      shuffled.slice(0, limit).forEach((question) => selected.set(question.id, question))
    }

    const wrongTarget = previousWrong.length ? Math.min(previousWrong.length, Math.ceil(total / 2)) : 0
    takeRandom(previousWrong, wrongTarget)
    takeRandom(newQuestions.filter((question) => !selected.has(question.id)), total - selected.size)
    if (selected.size < total) takeRandom(chapterQuestions.filter((question) => !selected.has(question.id)), total - selected.size)

    const selectedQuestions = [...selected.values()].sort(() => Math.random() - 0.5).slice(0, total)
    const session: MockSessionConfig = {
      questionIds: selectedQuestions.map((question) => question.id),
      examName: exam,
      mode: 'test',
      durationSeconds: selectedQuestions.length * 90,
      createdAt: Date.now(),
      kind: 'smart',
      subjectName: subject,
      chapterName: chapter,
    }
    startMockSession(session)
    router.push('/mock-tests/session')
  }

  const maxQuestions = Math.min(count, chapterQuestions.length)
  if (loading || !study.hydrated) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-brand-600" /></div>

  return (
    <div className="mx-auto max-w-4xl px-4 py-7 pb-28 sm:py-10">
      <header className="rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 p-5 text-white shadow-card sm:p-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold"><Sparkles size={14} /> Built around you</span>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Smart chapter test</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-white/90">Revisit questions you previously got wrong, then fill the rest with unseen questions from the same chapter.</p>
      </header>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          {examNames.length > 1 && <Field label="Exam"><select value={exam} onChange={(event) => { setExam(event.target.value); setSubject(''); setChapter('') }} className="admin-input"><option value="JEE Main">JEE Main</option>{examNames.filter((name) => name !== 'JEE Main').map((name) => <option key={name}>{name}</option>)}</select></Field>}
          <div><p className="mb-1.5 text-xs font-bold text-slate-600">Choose a subject</p><div className="grid grid-cols-3 gap-2">{subjects.map((name) => <button key={name} type="button" aria-pressed={sameSubject(subject, name)} onClick={() => { setSubject(name); setChapter('') }} className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-extrabold transition sm:text-sm ${sameSubject(subject, name) ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-100' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-emerald-50'}`}>{name}</button>)}</div></div>
          <Field label="Chapter"><select value={chapter} disabled={!subject} onChange={(event) => setChapter(event.target.value)} className="admin-input disabled:opacity-50"><option value="">Choose chapter</option>{chapters.map((name) => <option key={name} value={name}>{name}</option>)}</select>{subject && !chapters.length && <p className="mt-1 text-xs text-amber-700">No {subject} questions are loaded on this device yet. Add them from the Admin panel, then reload.</p>}</Field>
          <Field label="Question count"><div className="flex flex-wrap gap-2">{QUESTION_COUNTS.map((value) => <button key={value} type="button" onClick={() => setCount(value)} className={`rounded-xl border px-3.5 py-2 text-sm font-bold ${count === value ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>{value}</button>)}</div></Field>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <InfoCard icon={<NotebookPen size={17} />} title="Past mistakes" value={subject && chapter ? previousWrong.length : '—'} tone="rose" />
          <InfoCard icon={<Sparkles size={17} />} title="Unseen questions" value={subject && chapter ? newQuestions.length : '—'} tone="violet" />
          <InfoCard icon={<BookOpen size={17} />} title="Chapter total" value={subject && chapter ? chapterQuestions.length : '—'} tone="mint" />
        </div>

        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-950"><strong>How Smart Test works:</strong> it takes up to half of this chapter’s previous mistakes, adds unseen questions, then fills any remaining places from the same chapter. No other chapter is mixed in.</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4"><div className="flex items-center gap-2 text-sm font-bold text-ink-900"><Target size={18} className="text-brand-700" />{maxQuestions ? `${maxQuestions} questions · chapter-wise` : 'Choose a subject and chapter to begin'}</div><button onClick={buildTest} disabled={!chapter || !chapterQuestions.length || busy} className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Preparing…' : 'Build my Smart Test'} <ArrowRight size={15} /></button></div>
        {!chapter && <Link href="/mistakes" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-700">Open mistake book <ArrowRight size={13} /></Link>}
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>
}

function InfoCard({ icon, title, value, tone }: { icon: React.ReactNode; title: string; value: number | string; tone: 'rose' | 'violet' | 'mint' }) {
  const colors = { rose: 'bg-rose-50 text-rose-700', violet: 'bg-violet-50 text-violet-700', mint: 'bg-emerald-50 text-emerald-700' }
  return <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><span className={`grid h-8 w-8 place-items-center rounded-xl ${colors[tone]}`}>{icon}</span>{title}</div><p className="mt-3 font-display text-2xl font-extrabold text-ink-900">{value}</p></div>
}
