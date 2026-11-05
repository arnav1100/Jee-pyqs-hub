'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, Bookmark, ChevronLeft, ChevronRight, Filter, Loader2, Search, Sparkles } from 'lucide-react'
import MathText from '@/components/MathText'
import DifficultyBadge from '@/components/DifficultyBadge'
import { useQuestionLibrary, inferExamNames } from '@/lib/question-library'
import { useExamCatalog } from '@/lib/exam-catalog'
import { useStudyData } from '@/lib/study-data'

const PAGE_SIZE = 15
const DIFFICULTIES = ['Easy', 'Moderate', 'Difficult'] as const

type AttemptFilter = 'all' | 'attempted' | 'unattempted' | 'correct' | 'incorrect' | 'bookmarked'

export default function PYQLibraryPage() {
  const { questions, loading } = useQuestionLibrary()
  const { categories } = useExamCatalog()
  const study = useStudyData()
  const { attempts, bookmarks } = study
  const [exam, setExam] = useState('JEE Main')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [subject, setSubject] = useState('')
  const [chapter, setChapter] = useState('')
  const [shift, setShift] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [questionType, setQuestionType] = useState('')
  const [attemptStatus, setAttemptStatus] = useState<AttemptFilter>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'latest' | 'oldest' | 'difficulty' | 'random'>('latest')
  const [page, setPage] = useState(0)
  const [randomSeed, setRandomSeed] = useState(1)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedYear = Number(params.get('year'))
    if (params.get('exam')) setExam(params.get('exam') || 'JEE Main')
    if (Number.isFinite(requestedYear) && requestedYear > 0) setSelectedYears([requestedYear])
    if (params.get('subject')) setSubject(params.get('subject') || '')
    if (params.get('shift')) setShift(params.get('shift') || '')
  }, [])

  const examNames = useMemo(() => {
    const names = new Set([...categories.map((category) => category.name), ...inferExamNames(questions)])
    if (!names.has('JEE Main')) names.add('JEE Main')
    return ['JEE Main', ...Array.from(names).filter((name) => name !== 'JEE Main').sort()]
  }, [categories, questions])

  const examQuestions = useMemo(() => questions.filter((question) => question.examType === exam), [questions, exam])
  const years = useMemo(() => Array.from(new Set(examQuestions.map((question) => question.year))).sort((a, b) => b - a), [examQuestions])
  const subjects = useMemo(() => Array.from(new Set(examQuestions.map((question) => question.subjectName))).sort(), [examQuestions])
  const chapters = useMemo(() => Array.from(new Set(examQuestions.filter((question) => !subject || question.subjectName === subject).map((question) => question.chapterName))).sort(), [examQuestions, subject])
  const shifts = useMemo(() => Array.from(new Set(examQuestions.map((question) => question.shift).filter(Boolean))).sort(), [examQuestions])

  const latestAttempt = useMemo(() => {
    const map = new Map<string, (typeof attempts)[number]>()
    attempts.forEach((attempt) => {
      const previous = map.get(attempt.questionId)
      if (!previous || attempt.occurredAt > previous.occurredAt) map.set(attempt.questionId, attempt)
    })
    return map
  }, [attempts])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = examQuestions.filter((question) => {
      if (selectedYears.length && !selectedYears.includes(question.year)) return false
      if (subject && question.subjectName !== subject) return false
      if (chapter && question.chapterName !== chapter) return false
      if (shift && question.shift !== shift) return false
      if (difficulty && question.difficulty !== difficulty) return false
      if (questionType && (question.questionType || 'mcq') !== questionType) return false
      const attempt = latestAttempt.get(question.id)
      if (attemptStatus === 'attempted' && !attempt) return false
      if (attemptStatus === 'unattempted' && attempt) return false
      if (attemptStatus === 'correct' && !attempt?.correct) return false
      if (attemptStatus === 'incorrect' && (!attempt || attempt.correct)) return false
      if (attemptStatus === 'bookmarked' && !bookmarks.includes(question.id)) return false
      if (needle) {
        const haystack = [question.text, question.subjectName, question.chapterName, question.topic, question.year, question.shift, question.examType].join(' ').toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })

    if (sort === 'latest') rows.sort((a, b) => b.year - a.year || b.number - a.number)
    if (sort === 'oldest') rows.sort((a, b) => a.year - b.year || a.number - b.number)
    if (sort === 'difficulty') rows.sort((a, b) => DIFFICULTIES.indexOf(a.difficulty as typeof DIFFICULTIES[number]) - DIFFICULTIES.indexOf(b.difficulty as typeof DIFFICULTIES[number]))
    if (sort === 'random') rows.sort((a, b) => {
      const rank = (id: string) => {
        let value = randomSeed
        for (const char of id) value = (value * 31 + char.charCodeAt(0)) | 0
        return value
      }
      return rank(a.id) - rank(b.id)
    })
    return rows
  }, [examQuestions, selectedYears, subject, chapter, shift, difficulty, questionType, latestAttempt, attemptStatus, bookmarks, query, sort, randomSeed])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visibleQuestions = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function toggleYear(year: number) {
    setSelectedYears((current) => current.includes(year) ? current.filter((value) => value !== year) : [...current, year])
    setPage(0)
  }

  function resetFilters() {
    setSelectedYears([])
    setSubject('')
    setChapter('')
    setShift('')
    setDifficulty('')
    setQuestionType('')
    setAttemptStatus('all')
    setQuery('')
    setPage(0)
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-brand-600" /></div>

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 pb-24 sm:py-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700"><Sparkles size={14} /> PYQ Intelligence</div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-900">Question library</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Search real loaded PYQs, then narrow by year, shift, chapter, difficulty and your own attempt history.</p>
        </div>
        <Link href="/tests" className="inline-flex items-center justify-center rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800">Chapter test <ChevronRight size={16} /></Link>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-ink-900"><Filter size={16} /> Filters</h2>
            <button onClick={resetFilters} className="text-xs font-semibold text-brand-600 hover:underline">Reset</button>
          </div>
          <label className="mt-4 block text-xs font-semibold text-slate-500">Exam category</label>
          <select value={exam} onChange={(event) => { setExam(event.target.value); setPage(0) }} className="admin-input mt-1">
            {examNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <label className="mt-4 block text-xs font-semibold text-slate-500">Year (select one or more)</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {years.length ? years.map((year) => (
              <button key={year} onClick={() => toggleYear(year)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${selectedYears.includes(year) ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 text-slate-600 hover:border-brand-300'}`}>{year}</button>
            )) : <span className="text-xs text-slate-400">No year data yet</span>}
          </div>
          <FilterSelect label="Subject" value={subject} onChange={(value) => { setSubject(value); setChapter(''); setPage(0) }} options={subjects} allLabel="All subjects" />
          <FilterSelect label="Chapter" value={chapter} onChange={(value) => { setChapter(value); setPage(0) }} options={chapters} allLabel="All chapters" />
          <FilterSelect label="Shift" value={shift} onChange={(value) => { setShift(value); setPage(0) }} options={shifts} allLabel="All shifts" />
          <FilterSelect label="Difficulty" value={difficulty} onChange={(value) => { setDifficulty(value); setPage(0) }} options={Array.from(new Set(examQuestions.map((item) => item.difficulty))).sort()} allLabel="All difficulty" />
          <FilterSelect label="Question type" value={questionType} onChange={(value) => { setQuestionType(value); setPage(0) }} options={Array.from(new Set(examQuestions.map((item) => item.questionType || 'mcq')))} allLabel="All types" format={(value) => value === 'numerical' ? 'Numerical' : value === 'assertion-reason' ? 'Statement / Assertion' : 'MCQ'} />
          <label className="mt-4 block text-xs font-semibold text-slate-500">Attempt status</label>
          <select value={attemptStatus} onChange={(event) => { setAttemptStatus(event.target.value as AttemptFilter); setPage(0) }} className="admin-input mt-1">
            <option value="all">All questions</option><option value="attempted">Attempted</option><option value="unattempted">Unattempted</option><option value="correct">Last attempt correct</option><option value="incorrect">Last attempt incorrect</option><option value="bookmarked">Bookmarked</option>
          </select>
        </aside>

        <section className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder="Search question, topic, chapter or year…" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
            </label>
            <div className="flex gap-2">
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="admin-input min-w-[160px]">
                <option value="latest">Latest year first</option><option value="oldest">Oldest year first</option><option value="difficulty">Difficulty</option><option value="random">Random shuffle</option>
              </select>
              {sort === 'random' && <button onClick={() => setRandomSeed((seed) => seed + 1)} className="rounded-xl border border-slate-200 px-3 text-slate-600" aria-label="Shuffle"><ArrowUpDown size={16} /></button>}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span><strong className="text-ink-900">{filtered.length.toLocaleString()}</strong> questions found</span>
            <span>{selectedYears.length ? [...selectedYears].sort((a, b) => b - a).join(', ') : `${years.length} years available`}</span>
          </div>

          <div className="mt-3 space-y-3">
            {visibleQuestions.map((question) => (
              <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-brand-200 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">{question.examType}</span>
                  <span className="text-xs font-semibold text-slate-500">{question.year}{question.shift ? ` · ${question.shift}` : ''}</span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-xs text-slate-500">{question.subjectName} · {question.chapterName}</span>
                  <span className="ml-auto"><DifficultyBadge difficulty={question.difficulty} /></span>
                </div>
                <div className="mt-3 line-clamp-3 text-sm leading-6 text-ink-900"><MathText text={question.text} /></div>
                {question.topic && <p className="mt-2 text-xs text-slate-500">Topic: {question.topic}</p>}
                {question.roiTag && <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">⚡ {question.roiTag}</span>}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link href={`/practice?id=${encodeURIComponent(question.id)}&exam=${encodeURIComponent(question.examType)}`} className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-700">Practice this question</Link>
                  <button onClick={() => study.toggleBookmark(question.id)} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold ${study.bookmarks.includes(question.id) ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 hover:border-amber-200 hover:text-amber-700'}`}><Bookmark size={13} fill={study.bookmarks.includes(question.id) ? 'currentColor' : 'none'} />{study.bookmarks.includes(question.id) ? 'Saved' : 'Bookmark'}</button>
                </div>
              </article>
            ))}
            {!visibleQuestions.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-semibold text-ink-900">No questions match these filters</p><p className="mt-1 text-sm text-slate-500">Try clearing one or more filters.</p></div>}
          </div>

          {filtered.length > PAGE_SIZE && <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
            <button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 disabled:opacity-40"><ChevronLeft size={16} /> Previous</button>
            <span className="text-xs text-slate-500">Page {page + 1} of {pageCount}</span>
            <button disabled={page + 1 >= pageCount} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 disabled:opacity-40">Next <ChevronRight size={16} /></button>
          </div>}
        </section>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options, allLabel, format }: { label: string; value: string; onChange: (value: string) => void; options: string[]; allLabel: string; format?: (value: string) => string }) {
  return (
    <>
      <label className="mt-4 block text-xs font-semibold text-slate-500">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="admin-input mt-1">
        <option value="">{allLabel}</option>
        {options.map((option) => <option key={option} value={option}>{format ? format(option) : option}</option>)}
      </select>
    </>
  )
}
