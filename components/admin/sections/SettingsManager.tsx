'use client'

import { useEffect, useState } from 'react'
import { Loader2, ImagePlus, CheckCircle2 } from 'lucide-react'
import { useSettings, updateSettings, type SiteSettings } from '@/lib/settings'
import { uploadImage } from '@/lib/admin-data'

export default function SettingsManager() {
  const { settings, loading } = useSettings()
  const [form, setForm] = useState<SiteSettings>(settings)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState<'logoUrl' | 'qrImageUrl' | null>(null)

  useEffect(() => {
    if (!loading) setForm(settings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  async function handleUpload(file: File, field: 'logoUrl' | 'qrImageUrl') {
    setUploading(field)
    try {
      const url = await uploadImage(file, `site/${field}-${Date.now()}-${file.name}`)
      setForm((f) => ({ ...f, [field]: url }))
    } finally {
      setUploading(null)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setSaved(false)
    try {
      await updateSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-3 font-display text-sm font-bold text-ink-900">Branding</h3>
        <div className="space-y-3">
          <Field label="Website Name">
            <input
              value={form.siteName}
              onChange={(e) => setForm((f) => ({ ...f, siteName: e.target.value }))}
              className="admin-input"
            />
          </Field>
          <Field label="Logo">
            <ImageUploader
              url={form.logoUrl}
              uploading={uploading === 'logoUrl'}
              onUpload={(file) => handleUpload(file, 'logoUrl')}
              onClear={() => setForm((f) => ({ ...f, logoUrl: '' }))}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-3 font-display text-sm font-bold text-ink-900">Payments</h3>
        <div className="space-y-3">
          <Field label="QR Image">
            <ImageUploader
              url={form.qrImageUrl}
              uploading={uploading === 'qrImageUrl'}
              onUpload={(file) => handleUpload(file, 'qrImageUrl')}
              onClear={() => setForm((f) => ({ ...f, qrImageUrl: '' }))}
            />
          </Field>
          <Field label="UPI ID">
            <input
              value={form.upiId}
              onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))}
              placeholder="yourname@upi"
              className="admin-input"
            />
          </Field>
          <Field label="Payment Link">
            <input
              value={form.paymentLink}
              onChange={(e) => setForm((f) => ({ ...f, paymentLink: e.target.value }))}
              placeholder="https://..."
              className="admin-input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly Plan Price (₹)">
              <input
                type="number"
                value={form.monthlyPrice}
                onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: Number(e.target.value) }))}
                className="admin-input"
              />
            </Field>
            <Field label="Lifetime Plan Price (₹)">
              <input
                type="number"
                value={form.lifetimePrice}
                onChange={(e) => setForm((f) => ({ ...f, lifetimePrice: Number(e.target.value) }))}
                className="admin-input"
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-3 font-display text-sm font-bold text-ink-900">Announcement Banner</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.announcement.active}
              onChange={(e) =>
                setForm((f) => ({ ...f, announcement: { ...f.announcement, active: e.target.checked } }))
              }
            />
            Show banner on the site
          </label>
          <Field label="Banner Text">
            <input
              value={form.announcement.text}
              onChange={(e) => setForm((f) => ({ ...f, announcement: { ...f.announcement, text: e.target.value } }))}
              placeholder="🔥 New JEE Advanced 2026 PYQs added!"
              className="admin-input"
            />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || uploading !== null}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          Save Settings
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm font-medium text-easy">
            <CheckCircle2 size={16} /> Saved
          </span>
        )}
      </div>
    </form>
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

function ImageUploader({
  url,
  uploading,
  onUpload,
  onClear,
}: {
  url: string
  uploading: boolean
  onUpload: (file: File) => void
  onClear: () => void
}) {
  return url ? (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
      <button type="button" onClick={onClear} className="text-xs font-medium text-difficult">
        Remove
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
  )
}
