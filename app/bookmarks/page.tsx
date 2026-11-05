'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, Bookmark, ChevronRight, FolderOpen, Plus, Search, Sparkles } from 'lucide-react'
import MathText from '@/components/MathText'
import { useQuestionLibrary, type QuestionLibraryItem } from '@/lib/question-library'
import { useStudyData } from '@/lib/study-data'
import { chapterKey, subjectKey } from '@/lib/subject-utils'

interface ChapterGroup {
  key: string
  subject: string
  chapter: string
  questions: QuestionLibraryItem[]
}

export default function BookmarksPage() {
  const { questions, loading } = useQuestionLibrary()
  const study = useStudyData()
  const [selectedChapter, setSelectedChapter] = useState('')
  const [search, setSearch] = useState('')
  const [collectionDraft, setCollectionDraft] = useState('')
  const [selectedCollection, setSelectedCollection] = useState('')

  const questionMap = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions])
  const allCollections = Object.keys(study.collections).sort((a, b) => a.localeCompare(b))

  const chapterGroups = useMemo(() => {
    const map = new Map<string, ChapterGroup>()
    study.bookmarks.forEach((id) => {
      const question = questionMap.get(id)
      if (!question) return
      const key = `${subjectKey(question.subjectName)}|${chapterKey(question.chapterName)}`
      if (!map.has(key)) map.set(key, { key, subject: question.subjectName, chapter: question.chapterName, questions: [] })
      map.get(key)!.questions.push(question)
    })
    return [...map.values()].sort((a, b) => a.subject.localeCompare(b.subject) || a.chapter.localeCompare(b.chapter))
  }, [study.bookmarks, questionMap])

  const filteredGroups = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) return chapterGroups
    return chapterGroups.filter((group) => `${group.subject} ${group.chapter} ${group.questions.map((q) => q.topic || '').join(' ')}`.toLowerCase().includes(term))
  }, [chapterGroups, search])

  const activeGroup = chapterGroups.find((group) => group.key === selectedChapter)
  const collectionQuestions = selectedCollection
    ? study.bookmarks.map((id) => questionMap.get(id)).filter((question): question is QuestionLibraryItem => Boolean(question) && Boolean(study.collections[selectedCollection]?.includes(question!.id)))
    : []

  function addCollection(event: React.FormEvent) {
    event.preventDefault()
    const value = collectionDraft.trim()
    if (!value) return
    study.createCollection(value)
    setCollectionDraft('')
  }

  function renderQuestionCard(question: QuestionLibraryItem) {
    return (
      <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">{question.subjectName} · {question.chapterName}</span>
          <span className="text-xs text-slate-500">{question.examType} · {question.year} {question.shift}</span>
          <button onClick={() => study.toggleBookmark(question.id)} className="ml-auto rounded-lg p-2 text-amber-600 hover:bg-amber-50" aria-label="Remove bookmark"><Bookmark size={16} fill="currentColor" /></button>
        </div>
        <div className="mt-3 line-clamp-3 text-sm leading-6 text-ink-900"><MathText text={question.text} /></div>
        {study.notes[question.id] && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Note: {study.notes[question.id]}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link href={`/practice?id=${encodeURIComponent(question.id)}&exam=${encodeURIComponent(question.examType)}`} className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-bold text-white">Practice question</Link>
          {allCollections.length > 0 && (
            <select
              value={allCollections.find((name) => study.collections[name]?.includes(question.id)) || ''}
              onChange={(event) => { const name = event.target.value; if (name) study.toggleCollectionQuestion(name, question.id) }}
              className="admin-input max-w-[220px]"
            >
              <option value="">Add to a collection…</option>
              {allCollections.map((name) => <option key={name} value={name}>{name}{study.collections[name]?.includes(question.id) ? ' ✓' : ''}</option>)}
            </select>
          )}
          <span className="text-[11px] text-slate-400">{question.topic ? `Topic: ${question.topic}` : 'Saved question'}</span>
        </div>
      </article>
    )
  }

  if (loading || !study.hydrated) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-slate-500">Loading your bookmarks…</div>
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-28 sm:py-11">
      <header className="rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-5 text-white shadow-card sm:p-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold"><Bookmark size={14} /> Chapter-wise saved questions</span>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Bookmarks</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-white/90">Har bookmarked question apne chapter ke andar save hota hai. Chapter chunein (jaise Integration) aur wahi chapter ke saved questions revise karein.</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold">{study.bookmarks.length} saved · {chapterGroups.length} chapters</div>
      </header>

      {!study.bookmarks.length ? (
        <section className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-card">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Bookmark size={22} /></span>
          <h2 className="mt-3 font-display text-lg font-bold text-ink-900">No bookmarks yet</h2>
          <p className="mt-1 text-sm text-slate-500">Kisi bhi question par 🔖 dabayein — wo apne chapter ke andar yahan save ho jayega.</p>
          <Link href="/pyqs" className="mt-4 inline-flex rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white">Browse PYQs</Link>
        </section>
      ) : activeGroup ? (
        <section className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button onClick={() => setSelectedChapter('')} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-brand-300 hover:text-brand-800">
              <ArrowLeft size={14} /> All chapters
            </button>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">{activeGroup.subject}</p>
              <h2 className="font-display text-xl font-bold text-ink-900">{activeGroup.chapter}</h2>
            </div>
          </div>
          <div className="mt-4 space-y-3">{activeGroup.questions.map(renderQuestionCard)}</div>
        </section>
      ) : (
        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-card sm:p-6">
          <label className="relative block">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Chapter ka naam likhein — jaise Integration, Kinematics…" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-brand-400" />
          </label>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {filteredGroups.map((group) => (
              <button key={group.key} onClick={() => setSelectedChapter(group.key)} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card">
                <span className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-brand-700">{group.subject}</span>
                  <span className="mt-0.5 block truncate font-display text-sm font-bold text-ink-900">{group.chapter}</span>
                  <span className="mt-1 block text-[11px] text-slate-500">{group.questions.length} saved question{group.questions.length === 1 ? '' : 's'}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-slate-400" />
              </button>
            ))}
            {!filteredGroups.length && <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500 sm:col-span-2">Is naam se koi bookmarked chapter nahi mila.</p>}
          </div>
        </section>
      )}

      <details className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-card sm:p-6">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-900"><FolderOpen size={16} className="text-brand-700" /> Collections (optional)</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-[260px_1fr]">
          <div>
            <div className="space-y-1">
              {allCollections.map((name) => (
                <button key={name} onClick={() => setSelectedCollection(selectedCollection === name ? '' : name)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold ${selectedCollection === name ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <span className="truncate">{name}</span><span>{study.collections[name]?.length || 0}</span>
                </button>
              ))}
              {!allCollections.length && <p className="text-[11px] text-slate-500">Abhi koi collection nahi.</p>}
            </div>
            <form onSubmit={addCollection} className="mt-3 border-t border-slate-100 pt-3">
              <label className="text-[11px] font-semibold text-slate-500">New collection</label>
              <input value={collectionDraft} onChange={(event) => setCollectionDraft(event.target.value)} placeholder="e.g. Must revise" className="admin-input mt-1" />
              <button className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white"><Plus size={13} /> Create collection</button>
            </form>
          </div>
          <div className="space-y-3">
            {selectedCollection
              ? (collectionQuestions.length ? collectionQuestions.map(renderQuestionCard) : <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">Is collection me abhi koi question nahi hai.</p>)
              : <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">Kisi collection par click karein uske questions dekhne ke liye. Collections optional hain — aap sirf chapter-wise bookmarks use kar sakte hain.</p>}
          </div>
        </div>
      </details>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400"><Sparkles size={12} /> Bookmarks is browser me save hote hain (sign-in karne par account ke saath sync).</p>
    </div>
  )
}
