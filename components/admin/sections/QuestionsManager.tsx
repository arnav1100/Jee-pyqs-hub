'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, ImagePlus, X as XIcon } from 'lucide-react'
import {
  useAdminSubjects,
  useAdminChapters,
  useAdminQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  uploadImage,
  type AdminQuestion,
  type AdminQuestionInput,
} from '@/lib/admin-data'
import type { Difficulty, ExamType } from '@/data/mockData'
import AdminModal from '../AdminModal'
import MathText from '@/components/MathText'

const DIFFICULTIES: Difficulty[] = ['Easy', 'Moderate', 'Difficult']
const EXAM_TYPES: ExamType[] = ['JEE Main', 'JEE Advanced']

const EMPTY_FORM: AdminQuestionInput = {
  text: '',
  imageUrl: '',
  options: [
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ],
  correctOptionId: 'A',
  solution: '',
  solutionImageUrl: '',
  difficulty: 'Easy',
  examType: 'JEE Main',
  year: new Date().getFullYear(),
  shift: '',
  topic: '',
}

export default function QuestionsManager() {
  const { subjects } = useAdminSubjects()
  const [subjectId, setSubjectId] = useState('')
  useEffect(() => {
    if (!subjectId && subjects.length > 0) setSubjectId(subjects[0].id)
  }, [subjects, subjectId])

  const { chapters } = useAdminChapters(subjectId || undefined)
  const [chapterId, setChapterId] = useState('')
  useEffect(() => {
    setChapterId('')
  }, [subjectId])
  useEffect(() => {
    if (!chapterId && chapters.length > 0) setChapterId(chapters[0].id)
  }, [chapters, chapterId])

  const { questions, loading } = useAdminQuestions(subjectId || undefined, chapterId || undefined)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminQuestion | null>(null)
  const [form, setForm] = useState<AdminQuestionInput>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingField, setUploadingField] = useState<'imageUrl' | 'solutionImageUrl' | null>(null)

  const chapterSlug = chapters.find((c) => c.id === chapterId)?.slug || ''

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(question: AdminQuestion) {
    setEditing(question)
    setForm({
      text: question.text,
      imageUrl: question.imageUrl || '',
      options: question.options,
      correctOptionId: question.correctOptionId,
      solution: question.solution,
      solutionImageUrl: question.solutionImageUrl || '',
      difficulty: question.difficulty,
      examType: question.examType,
      year: question.year,
      shift: question.shift,
      topic: question.topic || '',
    })
    setError(null)
    setModalOpen(true)
  }

  async function handleImageUpload(file: File, field: 'imageUrl' | 'solutionImageUrl') {
    setUploadingField(field)
    try {
      const path = `questions/${subjectId}/${chapterId}/${field}-${Date.now()}-${file.name}`
      const url = await uploadImage(file, path)
      setForm((f) => ({ ...f, [field]: url }))
    } catch {
      setError('Image upload failed. Check your Storage rules and try again.')
    } finally {
      setUploadingField(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectId || !chapterId) return
    if (!form.text.trim() || form.options.some((o) => !o.text.trim()) || !form.solution.trim()) {
      setError('Question text, all four options, and a solution are required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (editing) {
        await updateQuestion(subjectId, chapterId, editing.id, editing.difficulty, form)
      } else {
        await addQuestion(subjectId, chapterId, chapterSlug, form)
      }
      setModalOpen(false)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(question: AdminQuestion) {
    if (!confirm(`Delete question #${question.number}?`)) return
    setDeletingId(question.id)
    try {
      await deleteQuestion(subjectId, chapterId, question.id, question.difficulty)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="admin-input max-w-[180px]">
            {subjects.length === 0 && <option value="">No subjects</option>}
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p style={{color: 'red', fontSize: '10px'}}>DEBUG chapters: {JSON.stringify(chapters.map(c => ({id: c.id, name: c.name})))}</p>
          <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} className="admin-input max-w-[220px]">
            {chapters.length === 0 && <option value="">No chapters</option>}
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={openAdd}
          disabled={!chapterId}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Plus size={16} /> Add Question
        </button>
      </div>

      {!chapterId ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
          Add a subject and chapter first.
        </p>
      ) : loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : questions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
          No questions in this chapter yet.
        </p>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                {q.number}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-ink-900">
                  <MathText text={q.text} />
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {q.difficulty} · {q.examType} · {q.year} · {q.shift || 'No shift'}
                </p>
              </div>
              <button onClick={() => openEdit(q)} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-ink-800" aria-label="Edit">
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(q)}
                disabled={deletingId === q.id}
                className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-difficult"
                aria-label="Delete"
              >
                {deletingId === q.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}

      <AdminModal open={modalOpen} title={editing ? `Edit Question #${editing.number}` : 'Add Question'} onClose={() => setModalOpen(false)} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Question Text">
            <textarea
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              rows={3}
              className="admin-input"
            />
          </Field>

          <ImageField
            label="Question Image (optional)"
            url={form.imageUrl}
            uploading={uploadingField === 'imageUrl'}
            onUpload={(file) => handleImageUpload(file, 'imageUrl')}
            onClear={() => setForm((f) => ({ ...f, imageUrl: '' }))}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {form.options.map((opt, i) => (
              <Field key={opt.id} label={`Option ${opt.id}`}>
                <input
                  value={opt.text}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      options: f.options.map((o, oi) => (oi === i ? { ...o, text: e.target.value } : o)),
                    }))
                  }
                  className="admin-input"
                />
              </Field>
            ))}
          </div>

          <Field label="Correct Answer">
            <select
              value={form.correctOptionId}
              onChange={(e) => setForm((f) => ({ ...f, correctOptionId: e.target.value as AdminQuestionInput['correctOptionId'] }))}
              className="admin-input"
            >
              {form.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Solution Text">
            <textarea
              value={form.solution}
              onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))}
              rows={3}
              className="admin-input"
            />
          </Field>

          <ImageField
            label="Solution Image (optional)"
            url={form.solutionImageUrl}
            uploading={uploadingField === 'solutionImageUrl'}
            onUpload={(file) => handleImageUpload(file, 'solutionImageUrl')}
            onClear={() => setForm((f) => ({ ...f, solutionImageUrl: '' }))}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Difficulty">
              <select
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as Difficulty }))}
                className="admin-input"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Exam">
              <select
                value={form.examType}
                onChange={(e) => setForm((f) => ({ ...f, examType: e.target.value as ExamType }))}
                className="admin-input"
              >
                {EXAM_TYPES.map((e2) => (
                  <option key={e2} value={e2}>
                    {e2}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Year">
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                className="admin-input"
              />
            </Field>
            <Field label="Shift">
              <input
                value={form.shift}
                onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))}
                placeholder="Shift 1 (Jan)"
                className="admin-input"
              />
            </Field>
          </div>

          <Field label="Topic">
            <input
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              placeholder="e.g. Projectile Motion"
              className="admin-input"
            />
          </Field>

          {error && <p className="text-xs font-medium text-difficult">{error}</p>}

<p className="text-[10px] text-red-500">MODAL DEBUG: subjectId={subjectId} chapterId={chapterId}</p>
          <button
            type="submit"
            disabled={busy || uploadingField !== null}
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

function ImageField({
  label,
  url,
  uploading,
  onUpload,
  onClear,
}: {
  label: string
  url?: string
  uploading: boolean
  onUpload: (file: File) => void
  onClear: () => void
}) {
  return (
    <Field label={label}>
      {url ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
          <button type="button" onClick={onClear} className="flex items-center gap-1 text-xs font-medium text-difficult">
            <XIcon size={14} /> Remove
          </button>
        </div>
      ) : (
        <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-4 text-xs font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          {uploading ? 'Uploading…' : 'Upload image'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUpload(file)
              e.target.value = ''
            }}
          />
        </label>
      )}
    </Field>
  )
}
