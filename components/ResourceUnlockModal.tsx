'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Clock, Copy, ExternalLink, Loader2, QrCode, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useSettings } from '@/lib/settings'
import {
  submitResourceRequest,
  useVerificationCountdown,
  VERIFICATION_MINUTES,
  type ResourceRequest,
  type StudyResource,
} from '@/lib/resources'

export default function ResourceUnlockModal({
  resource,
  existingRequest,
  open,
  onClose,
}: {
  resource: StudyResource
  existingRequest?: ResourceRequest
  open: boolean
  onClose: () => void
}) {
  const { user } = useAuth()
  const { settings } = useSettings()
  const [name, setName] = useState(user?.displayName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [utr, setUtr] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<ResourceRequest | null>(null)
  const [copied, setCopied] = useState(false)

  const pendingRequest = submitted || existingRequest
  const countdown = useVerificationCountdown(pendingRequest?.createdAt || Date.now())

  useEffect(() => {
    if (!open) return
    setName(user?.displayName || '')
    setEmail(user?.email || '')
    setUtr('')
    setError(null)
    setBusy(false)
    setSubmitted(null)
  }, [open, user])

  if (!open) return null

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(settings.upiId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Apna naam likhein.')
      return
    }
    if (!/^[A-Za-z0-9]{8,24}$/.test(utr.trim())) {
      setError('UTR / transaction ID galat lag raha hai — 8 se 24 letters/numbers daalein.')
      return
    }
    setBusy(true)
    try {
      const record = await submitResourceRequest({
        resourceId: resource.id,
        resourceTitle: resource.title,
        uid: user?.uid || 'local',
        name,
        email,
        utr,
        amount: resource.price,
      })
      setSubmitted(record)
    } catch {
      setError('Request submit nahi ho payi. Internet check karke dobara koshish karein.')
    } finally {
      setBusy(false)
    }
  }

  const isPending = Boolean(pendingRequest && pendingRequest.status === 'pending')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-800"><ShieldCheck size={12} /> Paid resource · ₹{resource.price}</span>
            <h2 className="mt-2 font-display text-lg font-bold text-ink-900">{resource.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-ink-900" aria-label="Close"><X size={18} /></button>
        </div>

        {isPending ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
            <Clock className="mx-auto text-amber-600" size={30} />
            <p className="mt-2 font-display text-base font-bold text-amber-950">We are verifying your payment</p>
            <p className="mt-1 text-xs leading-5 text-amber-900">
              Please wait {VERIFICATION_MINUTES} minutes. Aapka UTR <strong>{pendingRequest?.utr}</strong> review ke liye bhej diya gaya hai.
            </p>
            <p className="mt-3 font-display text-2xl font-extrabold text-amber-900">{countdown.done ? 'Almost done…' : countdown.label}</p>
            <p className="mt-1 text-[11px] text-amber-800">{countdown.done ? 'Verification window complete. Approval ke baad ye file khud unlock ho jayegi.' : 'Is page ko band karne ki zaroorat nahi — status khud update hoga.'}</p>
            <button onClick={onClose} className="mt-4 w-full rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white hover:bg-amber-700">Got it</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><QrCode size={15} /> Pay ₹{resource.price} via UPI</div>
              <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row">
                {settings.qrImageUrl ? (
                  <Image src={settings.qrImageUrl} alt="Payment QR code" width={128} height={128} className="h-32 w-32 rounded-xl border border-slate-200 bg-white object-contain p-1" unoptimized />
                ) : (
                  <div className="grid h-32 w-32 place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-center text-[10px] font-semibold text-slate-400">QR code<br />admin panel → Settings me add karein</div>
                )}
                <div className="w-full text-left">
                  {settings.upiId ? (
                    <button type="button" onClick={copyUpi} className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-ink-900 hover:border-brand-300">
                      <span className="truncate">{settings.upiId}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-brand-700">{copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-500">UPI ID abhi set nahi hai — admin panel → Settings me daalein.</p>
                  )}
                  {settings.paymentLink && (
                    <a href={settings.paymentLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700">Open payment page <ExternalLink size={12} /></a>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Your name</span><input value={name} onChange={(event) => setName(event.target.value)} className="admin-input" placeholder="Full name" /></label>
              <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Email (optional)</span><input value={email} onChange={(event) => setEmail(event.target.value)} className="admin-input" placeholder="you@email.com" /></label>
            </div>
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">UTR / Transaction ID</span><input value={utr} onChange={(event) => setUtr(event.target.value)} className="admin-input uppercase" placeholder="e.g. 123456789012" /></label>

            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}

            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-sm font-extrabold text-white hover:bg-brand-800 disabled:opacity-60">
              {busy && <Loader2 size={15} className="animate-spin" />} I have paid — submit UTR
            </button>
            <p className="text-center text-[11px] leading-4 text-slate-500">Submit karne ke baad {VERIFICATION_MINUTES} minute tak verification message dikhega. Approve hone par file turant khul jayegi.</p>
          </form>
        )}
      </div>
    </div>
  )
}
