'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import {
  useAdminSubjects,
  useAdminChapters,
  addChapter,
  updateChapter,
  deleteChapter,
  type AdminChapter,
} from '@/lib/admin-data'
import AdminModal from '../AdminModal'

const EMPTY_FORM = { slug: '', name: '' }

export default function ChaptersManager() {
  const { subjects } = useAdminSubjects()
  const [subjectId, setSubjectId] = useState<string>('')

  useEffect(() => {
    if (!subjectId && subjects.length > 0) setSubjectId(subjects[0].id)
  }, [subjects, subjectId])

  const { chapters, loading } = useAdminChapters(subjectId || undefined)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminChapter | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(chapter: AdminChapter) {
    setEditing(chapter)
    setForm({ slug: chapter.slug, name: chapter.name })
    setError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectId) return
    if (!form.slug.trim() || !form.name.trim()) {
      setError('Slug and name are required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const slug = form.slug.trim().toLowerCase().replace(/\s+/g, '-')
      if (editing) {
        await updateChapter(subjectId, editing.id, { ...form, slug })
      } else {
        await addChapter(subjectId, { ...form, slug })
      }
      setModalOpen(false)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(chapter: AdminChapter) {
    if (!confirm(`Delete "${chapter.name}"? This also deletes all of its questions.`)) return
    setDeletingId(chapter.id)
    try {
      await deleteChapter(subjectId, chapter.id, chapter.totalQuestions || 0)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="admin-input max-w-[220px]"
        >
          {subjects.length === 0 && <option value="">No subjects yet</option>}
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          onClick={openAdd}
          disabled={!subjectId}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Plus size={16} /> Add Chapter
        </button>
      </div>

      {!subjectId ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
          Add a subject first from the Subjects tab.
        </p>
      ) : loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : chapters.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
          No chapters in this subject yet.
        </p>
      ) : (
        <div className="space-y-2">
          {chapters.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{c.name}</p>
                <p className="text-xs text-slate-500">
                  /{c.slug} · {c.totalQuestions} questions ({c.easy} easy · {c.moderate} moderate · {c.difficult} difficult)
                </p>
              </div>
              <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-ink-800" aria-label="Edit">
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(c)}
                disabled={deletingId === c.id}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-difficult"
                aria-label="Delete"
              >
                {deletingId === c.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}

      <AdminModal open={modalOpen} title={editing ? 'Edit Chapter' : 'Add Chapter'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Subject">
            <input value={subjects.find((s) => s.id === subjectId)?.name || ''} disabled className="admin-input bg-slate-50 text-slate-400" />
          </Field>
          <Field label="Chapter Name">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Kinematics"
              className="admin-input"
            />
          </Field>
          <Field label="Slug (used in the URL)">
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="kinematics"
              className="admin-input"
            />
          </Field>

          {error && <p className="text-xs font-medium text-difficult">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </form>
      </AdminModal>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}
