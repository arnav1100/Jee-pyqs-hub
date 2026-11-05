'use client'

import { useMemo, useState } from 'react'
import { BookOpenCheck, Loader2, Plus, Save, ShieldCheck } from 'lucide-react'
import { DEFAULT_EXAM_CATEGORY, useExamCatalog, type ExamCategory } from '@/lib/exam-catalog'

const EMPTY_FORM = {
  name: '',
  slug: '',
  subjects: 'Physics, Chemistry, Mathematics',
  correct: '4',
  incorrect: '-1',
  unattempted: '0',
}

function slugify(value: string) {
  return value.trim().toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function ExamCategoriesManager() {
  const { categories, loading, saveCategory } = useExamCatalog()
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingSlug, setEditingSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const safeSlug = useMemo(() => slugify(form.slug || form.name), [form.slug, form.name])

  function startEdit(category: ExamCategory) {
    setEditingSlug(category.slug)
    setForm({
      name: category.name,
      slug: category.slug,
      subjects: category.subjects.join(', '),
      correct: String(category.markingScheme.correct),
      incorrect: String(category.markingScheme.incorrect),
      unattempted: String(category.markingScheme.unattempted),
    })
    setMessage('')
    setError('')
  }

  function resetForm() {
    setEditingSlug('')
    setForm(EMPTY_FORM)
    setMessage('')
    setError('')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const name = form.name.trim()
    const slug = safeSlug
    const subjects = form.subjects.split(',').map((item) => item.trim()).filter(Boolean)
    if (!name || !slug || subjects.length === 0) {
      setError('Enter an exam name, a URL-safe slug and at least one subject.')
      return
    }
    const collision = categories.find((category) => category.slug === slug && category.slug !== editingSlug)
    if (collision) {
      setError(`The slug “${slug}” is already in use.`)
      return
    }
    const scheme = { correct: Number(form.correct), incorrect: Number(form.incorrect), unattempted: Number(form.unattempted) }
    if (Object.values(scheme).some((value) => !Number.isFinite(value))) {
      setError('Enter a numeric marking value for correct, incorrect and unattempted answers.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await saveCategory({ slug, name, subjects, markingScheme: scheme, ...(editingSlug ? { createdAt: categories.find((category) => category.slug === editingSlug)?.createdAt } : {}) })
      setMessage(`${name} is saved. Its category will appear in the PYQ filters and test builder.`)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this exam category. Check your connection and admin permissions.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><div className="flex items-center gap-2 font-bold"><ShieldCheck size={17} /> Dynamic exam categories</div><p className="mt-1 text-xs leading-5">JEE Main is the primary category. Add a category here; its name and marking scheme are used automatically by the question library and mock-test builder. Categories are additive—this panel does not delete existing question records.</p></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-bold text-ink-900">Available categories</h2><p className="mt-1 text-xs text-slate-500">Configured in the repository, browser fallback or Firestore</p></div><BookOpenCheck size={20} className="text-brand-600" /></div>{loading ? <p className="mt-5 text-sm text-slate-400">Loading categories…</p> : <div className="mt-4 space-y-2">{categories.map((category) => <div key={category.slug} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 font-display text-sm font-bold text-brand-700">{category.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-ink-900">{category.name}{category.slug === DEFAULT_EXAM_CATEGORY.slug && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">Primary</span>}</p><p className="text-xs text-slate-500">/{category.slug} · {category.subjects.join(', ')}</p><p className="mt-1 text-[11px] text-slate-400">+{category.markingScheme.correct} correct · {category.markingScheme.incorrect} incorrect · {category.markingScheme.unattempted} unattempted</p></div><button onClick={() => startEdit(category)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-ink-700 hover:border-brand-300">Edit</button></div>)}</div>}</section>

        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-bold text-ink-900">{editingSlug ? 'Edit category' : 'Create category'}</h2><p className="mt-1 text-xs text-slate-500">Future exams do not need code changes.</p></div><button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="New exam category"><Plus size={16} /></button></div><Field label="Exam name"><input value={form.name} disabled={editingSlug === DEFAULT_EXAM_CATEGORY.slug} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: editingSlug ? current.slug : '' }))} placeholder="e.g. WBJEE" className="admin-input disabled:opacity-60" /></Field><Field label="Slug"><input value={form.slug} disabled={Boolean(editingSlug)} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder={safeSlug || 'wbjee'} className="admin-input disabled:opacity-60" /><span className="mt-1 block text-[10px] text-slate-400">URL-safe id: {safeSlug || '—'}</span></Field><Field label="Subjects (comma-separated)"><input value={form.subjects} onChange={(event) => setForm((current) => ({ ...current, subjects: event.target.value }))} placeholder="Physics, Chemistry, Mathematics" className="admin-input" /></Field><div className="grid grid-cols-3 gap-2"><Field label="Correct"><input type="number" value={form.correct} onChange={(event) => setForm((current) => ({ ...current, correct: event.target.value }))} className="admin-input" /></Field><Field label="Incorrect"><input type="number" value={form.incorrect} onChange={(event) => setForm((current) => ({ ...current, incorrect: event.target.value }))} className="admin-input" /></Field><Field label="Unattempted"><input type="number" value={form.unattempted} onChange={(event) => setForm((current) => ({ ...current, unattempted: event.target.value }))} className="admin-input" /></Field></div>{message && <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p>}{error && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-800">{error}</p>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{busy ? 'Saving…' : editingSlug ? 'Save category' : 'Create category'}</button></form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>
}
