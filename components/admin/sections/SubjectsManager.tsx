'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useAdminSubjects, addSubject, updateSubject, deleteSubject, type AdminSubject } from '@/lib/admin-data'
import AdminModal from '../AdminModal'

const EMPTY_FORM = { slug: '', name: '', colorFrom: '#1652f0', colorTo: '#2570fb' }

export default function SubjectsManager() {
  const { subjects, loading } = useAdminSubjects()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminSubject | null>(null)
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

  function openEdit(subject: AdminSubject) {
    setEditing(subject)
    setForm({ slug: subject.slug, name: subject.name, colorFrom: subject.colorFrom, colorTo: subject.colorTo })
    setError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.slug.trim() || !form.name.trim()) {
      setError('Slug and name are required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const slug = form.slug.trim().toLowerCase().replace(/\s+/g, '-')
      if (editing) {
        await updateSubject(editing.id, { ...form, slug })
      } else {
        await addSubject({ ...form, slug })
      }
      setModalOpen(false)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Check your Firestore rules and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(subject: AdminSubject) {
    if (!confirm(`Delete "${subject.name}"? This also deletes all of its chapters and questions.`)) return
    setDeletingId(subject.id)
    try {
      await deleteSubject(subject.id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{subjects.length} subject{subjects.length === 1 ? '' : 's'}</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Add Subject
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : subjects.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
          No subjects yet — add your first one.
        </p>
      ) : (
        <div className="space-y-2">
          {subjects.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-card"
            >
              <span
                className="h-9 w-9 shrink-0 rounded-lg"
                style={{ background: `linear-gradient(135deg, ${s.colorFrom}, ${s.colorTo})` }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{s.name}</p>
                <p className="text-xs text-slate-500">
                  /{s.slug} · {s.totalChapters} chapters · {s.totalQuestions} questions
                </p>
              </div>
              <button
                onClick={() => openEdit(s)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-ink-800"
                aria-label="Edit"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(s)}
                disabled={deletingId === s.id}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-difficult"
                aria-label="Delete"
              >
                {deletingId === s.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}

      <AdminModal open={modalOpen} title={editing ? 'Edit Subject' : 'Add Subject'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Name">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Physics"
              className="admin-input"
            />
          </Field>
          <Field label="Slug (used in the URL)">
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="physics"
              className="admin-input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Color from">
              <input
                type="color"
                value={form.colorFrom}
                onChange={(e) => setForm((f) => ({ ...f, colorFrom: e.target.value }))}
                className="h-10 w-full rounded-xl border border-slate-200"
              />
            </Field>
            <Field label="Color to">
              <input
                type="color"
                value={form.colorTo}
                onChange={(e) => setForm((f) => ({ ...f, colorTo: e.target.value }))}
                className="h-10 w-full rounded-xl border border-slate-200"
              />
            </Field>
          </div>

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
