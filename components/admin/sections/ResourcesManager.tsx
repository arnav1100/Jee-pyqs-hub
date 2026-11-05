'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, ExternalLink, Loader2, Plus, Trash2, UploadCloud, XCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { isConfigured } from '@/lib/firebase'
import { uploadImage } from '@/lib/admin-data'
import { useSettings } from '@/lib/settings'
import {
  readFileAsDataUrl,
  removeResource,
  reviewResourceRequest,
  saveResource,
  useAllResourceRequests,
  useResources,
  type ResourceAccess,
  type ResourceType,
} from '@/lib/resources'

const EMPTY = {
  title: '',
  description: '',
  subject: 'Physics',
  type: 'pdf' as ResourceType,
  access: 'free' as ResourceAccess,
  price: 49,
  fileUrl: '',
  fileName: '',
}

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-800',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
} as const

export default function ResourcesManager() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { resources, loading } = useResources()
  const requests = useAllResourceRequests()
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  async function handleFile(file: File | null) {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      if (isConfigured && user) {
        const url = await uploadImage(file, `site/resources/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-')}`)
        setForm((current) => ({ ...current, fileUrl: url, fileName: file.name }))
      } else {
        const dataUrl = await readFileAsDataUrl(file)
        setForm((current) => ({ ...current, fileUrl: dataUrl, fileName: file.name }))
      }
      setMessage('File ready. Ab "Save resource" dabayein.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fail ho gaya.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (!form.title.trim()) { setError('Title likhein.'); return }
    if (!form.fileUrl.trim()) { setError('PDF upload karein ya link paste karein.'); return }
    if (form.access === 'paid' && !(Number(form.price) > 0)) { setError('Paid resource ke liye price daalein.'); return }
    setBusy(true)
    try {
      await saveResource({ ...form, price: Number(form.price) || 0, active: true })
      setForm(EMPTY)
      setMessage('Resource saved — students ko turant dikhega.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save fail ho gaya.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    await removeResource(id)
    setMessage('Resource delete ho gaya.')
  }

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    setReviewingId(id)
    try {
      await reviewResourceRequest(id, status)
    } finally {
      setReviewingId(null)
    }
  }

  const pendingCount = requests.filter((request) => request.status === 'pending').length

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">Add a resource</h2>
            <p className="mt-1 text-xs text-slate-500">PDF / notes / link upload karein. Free ya paid (QR + UPI se payment) chunein.</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">{resources.length} uploaded</span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-600">Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Electrostatics — one shot notes" className="admin-input" /></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-600">Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} placeholder="Kya milega is file me…" className="admin-input" /></label>
          <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Subject</span><input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} className="admin-input" /></label>
          <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Type</span>
            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ResourceType })} className="admin-input">
              <option value="pdf">PDF</option>
              <option value="notes">Notes</option>
              <option value="link">External link</option>
            </select>
          </label>
          <div><span className="mb-1 block text-xs font-bold text-slate-600">Access</span>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm({ ...form, access: 'free' })} className={`rounded-xl border px-3 py-2.5 text-xs font-extrabold ${form.access === 'free' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>Free</button>
              <button type="button" onClick={() => setForm({ ...form, access: 'paid' })} className={`rounded-xl border px-3 py-2.5 text-xs font-extrabold ${form.access === 'paid' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600'}`}>Paid</button>
            </div>
          </div>
          <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Price (₹) — paid only</span><input type="number" min={1} value={form.price} disabled={form.access === 'free'} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} className="admin-input disabled:opacity-50" /></label>

          <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} {uploading ? 'Uploading…' : 'Upload PDF / file'}
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
              </label>
              <span className="text-[11px] text-slate-500">{form.fileName || (form.fileUrl ? 'File ready' : 'ya neeche link paste karein')}</span>
              {form.fileUrl && <a href={form.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700">Preview <ExternalLink size={11} /></a>}
            </div>
            <input value={form.fileUrl.startsWith('data:') ? '' : form.fileUrl} onChange={(event) => setForm({ ...form, fileUrl: event.target.value, fileName: '' })} placeholder="https://drive.google.com/… (PDF ya notes ka link)" className="admin-input mt-2 text-xs" />
            <p className="mt-1 text-[10px] text-slate-400">{isConfigured ? 'Firebase configured — file Storage me upload hoti hai, sabko dikhti hai.' : 'Firebase configured nahi hai — file sirf is browser me save hogi (1.5 MB tak). Live site par Firebase env vars ke saath upload karein.'}</p>
          </div>

          {error && <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
          {message && <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{message}</p>}

          <button disabled={busy} className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-sm font-extrabold text-white hover:bg-brand-800 disabled:opacity-60">{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Save resource</button>
        </form>

        {!settings.upiId && form.access === 'paid' && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">Paid resource ke liye pehle <strong>Settings</strong> me UPI ID, QR image aur payment link set karein.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="font-display text-lg font-bold text-ink-900">Uploaded resources</h2>
        {loading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-brand-600" /></div> : resources.length ? (
          <div className="mt-3 divide-y divide-slate-100">
            {resources.map((resource) => (
              <div key={resource.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-900">{resource.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{resource.subject} · {resource.type.toUpperCase()} · {resource.access === 'paid' ? `₹${resource.price}` : 'Free'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {resource.fileUrl && <a href={resource.fileUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-brand-700" aria-label="Open resource"><ExternalLink size={14} /></a>}
                  <button onClick={() => handleDelete(resource.id)} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50" aria-label="Delete resource"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">Abhi koi resource nahi hai.</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-ink-900">Payment verification queue</h2>
          <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${pendingCount ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>{pendingCount} pending</span>
        </div>
        {requests.length ? (
          <div className="mt-3 space-y-2">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-900">{request.resourceTitle}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{request.name}{request.email ? ` · ${request.email}` : ''} · UTR <strong className="font-mono">{request.utr}</strong> · ₹{request.amount}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${STATUS_STYLES[request.status]}`}>{request.status}</span>
                    {request.status === 'pending' && (
                      <>
                        <button onClick={() => handleReview(request.id, 'approved')} disabled={reviewingId === request.id} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{reviewingId === request.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve</button>
                        <button onClick={() => handleReview(request.id, 'rejected')} disabled={reviewingId === request.id} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"><XCircle size={12} /> Reject</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-500"><Clock size={14} /> Abhi koi payment request nahi aayi.</p>}
      </section>
    </div>
  )
}
