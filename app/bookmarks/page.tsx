'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Bookmark, ChevronRight, Plus, Sparkles } from 'lucide-react'
import MathText from '@/components/MathText'
import { useQuestionLibrary } from '@/lib/question-library'
import { useStudyData } from '@/lib/study-data'

export default function BookmarksPage() {
  const { questions, loading } = useQuestionLibrary()
  const study = useStudyData()
  const [selectedCollection, setSelectedCollection] = useState('')
  const [collectionDraft, setCollectionDraft] = useState('')
  const questionMap = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions])
  const allCollections = Object.keys(study.collections).sort((a, b) => a.localeCompare(b))
  const bookmarkedQuestions = study.bookmarks.map((id) => questionMap.get(id)).filter((question) => Boolean(question))
  const visible = selectedCollection ? bookmarkedQuestions.filter((question) => study.collections[selectedCollection]?.includes(question!.id)) : bookmarkedQuestions

  function addCollection(event: React.FormEvent) {
    event.preventDefault()
    const value = collectionDraft.trim()
    if (!value) return
    study.createCollection(value)
    setSelectedCollection(value)
    setCollectionDraft('')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:py-11"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"><Bookmark size={14} /> Personal question bank</span><h1 className="mt-3 font-display text-3xl font-bold text-ink-900">Bookmarks &amp; collections</h1><p className="mt-1 text-sm text-slate-500">Save questions for later, organize them into collections, and add your own revision notes.</p></div><Link href="/practice?source=bookmarks" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white">Revise bookmarks <ChevronRight size={15} /></Link></div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[280px_1fr]"><aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-card"><h2 className="font-display text-sm font-bold text-ink-900">Collections</h2><button onClick={() => setSelectedCollection('')} className={`mt-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold ${!selectedCollection ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}><span>All bookmarks</span><span>{study.bookmarks.length}</span></button>{allCollections.map((name) => <button key={name} onClick={() => setSelectedCollection(name)} className={`mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold ${selectedCollection === name ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}><span className="truncate">{name}</span><span>{study.collections[name]?.length || 0}</span></button>)}<form onSubmit={addCollection} className="mt-4 border-t border-slate-100 pt-4"><label className="text-xs font-semibold text-slate-500">New collection</label><input value={collectionDraft} onChange={(event) => setCollectionDraft(event.target.value)} placeholder="e.g. Must revise" className="admin-input mt-1" /><button className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white"><Plus size={13} /> Create collection</button></form><div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500"><Sparkles size={13} className="mb-1 text-brand-600" />Collections and bookmarks stay local without sign-in and sync to your account when Firebase is connected.</div></aside>

        <section className="min-w-0">{loading || !study.hydrated ? <p className="py-10 text-center text-sm text-slate-500">Loading your bookmarks…</p> : visible.length ? <div className="space-y-3">{visible.map((question) => question && <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">{question.subjectName} · {question.chapterName}</span><span className="text-xs text-slate-500">{question.examType} · {question.year} {question.shift}</span><button onClick={() => study.toggleBookmark(question.id)} className="ml-auto rounded-lg p-2 text-amber-600 hover:bg-amber-50" aria-label="Remove bookmark"><Bookmark size={16} fill="currentColor" /></button></div><div className="mt-3 line-clamp-3 text-sm leading-6 text-ink-900"><MathText text={question.text} /></div>{study.notes[question.id] && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Note: {study.notes[question.id]}</p>}<div className="mt-3 flex flex-wrap items-center gap-2"><Link href={`/practice?id=${encodeURIComponent(question.id)}&exam=${encodeURIComponent(question.examType)}`} className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-bold text-white">Practice question</Link><select value={(allCollections.find((name) => study.collections[name]?.includes(question.id)) || '')} onChange={(event) => { const name = event.target.value; if (name) study.toggleCollectionQuestion(name, question.id) }} className="admin-input max-w-[220px]"><option value="">Add to a collection…</option>{allCollections.map((name) => <option key={name} value={name}>{name}{study.collections[name]?.includes(question.id) ? ' ✓' : ''}</option>)}</select><span className="text-[11px] text-slate-400">{question.topic ? `Topic: ${question.topic}` : 'Personal revision question'}</span></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Bookmark size={22} /></span><h2 className="mt-3 font-display text-lg font-bold text-ink-900">{selectedCollection ? `No questions in “${selectedCollection}”` : 'No bookmarks yet'}</h2><p className="mt-1 text-sm text-slate-500">Use the bookmark button in the PYQ library or while practicing to save important questions.</p><Link href="/pyqs" className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-ink-700">Browse PYQs</Link></div>}</section></div>
    </div>
  )
}
