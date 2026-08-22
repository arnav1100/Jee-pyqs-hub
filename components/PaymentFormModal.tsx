'use client'

import { useState } from 'react'
import { X, Loader2, UploadCloud, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { submitPayment, uploadImage } from '@/lib/admin-data'

interface PaymentFormModalProps {
  open: boolean
  onClose: () => void
  plan: 'monthly' | 'lifetime'
  amount: number
}

export default function PaymentFormModal({ open, onClose, plan, amount }: PaymentFormModalProps) {
  const { user } = useAuth()
  const [name, setName] = useState(user?.displayName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [transactionId, setTransactionId] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!open) return null

  function reset() {
    setTransactionId('')
    setScreenshot(null)
    setError(null)
    setDone(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!user) {
      setError('Please sign in first.')
      return
    }
    if (!name.trim() || !email.trim() || !transactionId.trim()) {
      setError('Please fill in all fields.')
      return
    }
    if (!screenshot) {
      setError('Please attach a payment screenshot.')
      return
    }

    setBusy(true)
    try {
      const screenshotUrl = await uploadImage(
        screenshot,
        `payment-proofs/${user.uid}/${Date.now()}-${screenshot.name}`
      )
      await submitPayment(user.uid, {
        name: name.trim(),
        email: email.trim(),
        plan,
        amount,
        transactionId: transactionId.trim(),
        screenshotUrl,
      })
      setDone(true)
    } catch (err) {
      setError('Could not submit your payment. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">
            {done ? 'Request submitted' : 'Confirm Your Payment'}
          </h2>
          <button onClick={handleClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-ink-900">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto mb-3 text-easy" size={40} />
            <p className="text-sm text-ink-800">
              Thanks! Your {plan === 'monthly' ? 'Monthly' : 'Lifetime'} plan request is pending admin review.
              You'll get full access as soon as it's approved.
            </p>
            <button
              onClick={handleClose}
              className="mt-5 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-slate-500">
              {plan === 'monthly' ? 'Monthly Plan' : 'Lifetime Plan'} · ₹{amount} — fill this in after you've paid via the QR/UPI details.
            </p>
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} className="admin-input" />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="admin-input" />
            </Field>
            <Field label="Transaction ID / UTR">
              <input
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. 123456789012"
                className="admin-input"
              />
            </Field>
            <Field label="Payment Screenshot">
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-4 text-xs font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600">
                <UploadCloud size={16} />
                {screenshot ? screenshot.name : 'Upload screenshot'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                />
              </label>
            </Field>

            {error && <p className="text-xs font-medium text-difficult">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              I Have Paid — Submit
            </button>
          </form>
        )}
      </div>
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
