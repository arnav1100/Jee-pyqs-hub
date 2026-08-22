'use client'

import { useState } from 'react'
import { Plus, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import {
  useAdminPayments,
  addPayment,
  approvePayment,
  rejectPayment,
  updatePaymentStatus,
  useAdminUsers,
  type AdminPayment,
} from '@/lib/admin-data'
import AdminModal from '../AdminModal'

const EMPTY_FORM: { name: string; email: string; plan: 'monthly' | 'lifetime'; amount: number; note: string } = {
  name: '',
  email: '',
  plan: 'monthly',
  amount: 0,
  note: '',
}

const STATUS_STYLES: Record<AdminPayment['status'], string> = {
  pending: 'bg-amber-50 text-moderate',
  verified: 'bg-emerald-50 text-easy',
  rejected: 'bg-red-50 text-difficult',
}

export default function PaymentsManager() {
  const { payments, loading } = useAdminPayments()
  const { users } = useAdminUsers()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.amount) return
    setBusy(true)
    try {
      const matchingUser = users.find((u) => u.email?.toLowerCase() === form.email.trim().toLowerCase())
      await addPayment({ ...form, uid: matchingUser?.id })
      setModalOpen(false)
      setForm(EMPTY_FORM)
    } finally {
      setBusy(false)
    }
  }

  async function handleStatus(payment: AdminPayment, status: AdminPayment['status']) {
    setUpdatingId(payment.id)
    try {
      if (status === 'verified') {
        // Approves the request, activates the plan on the user's account
        // (30 days for Monthly, unlimited for Lifetime), and logs a
        // subscriptions record — see lib/admin-data.ts#approvePayment.
        await approvePayment(payment)
      } else if (status === 'rejected') {
        await rejectPayment(payment.id)
      } else {
        await updatePaymentStatus(payment.id, status)
      }
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{payments.length} payment{payments.length === 1 ? '' : 's'} logged</p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Log Payment
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : payments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
          No payments logged yet. Verified UPI/QR payments can be recorded here manually.
        </p>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{p.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {p.email} · {p.plan === 'monthly' ? 'Monthly' : 'Lifetime'} · ₹{p.amount}
                  {p.transactionId ? ` · Txn: ${p.transactionId}` : ''}
                </p>
                {p.screenshotUrl && (
                  <a
                    href={p.screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-brand-600 hover:underline"
                  >
                    View screenshot
                  </a>
                )}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[p.status]}`}>
                {p.status}
              </span>
              {updatingId === p.id ? (
                <Loader2 size={16} className="animate-spin text-slate-400" />
              ) : p.status === 'pending' ? (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleStatus(p, 'verified')}
                    className="rounded-lg p-2 text-easy hover:bg-emerald-50"
                    aria-label="Verify"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <button
                    onClick={() => handleStatus(p, 'rejected')}
                    className="rounded-lg p-2 text-difficult hover:bg-red-50"
                    aria-label="Reject"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleStatus(p, 'pending')}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  aria-label="Reset to pending"
                >
                  <Clock size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <AdminModal open={modalOpen} title="Log Payment" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Name">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="admin-input" />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="admin-input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan">
              <select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as 'monthly' | 'lifetime' }))} className="admin-input">
                <option value="monthly">Monthly</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </Field>
            <Field label="Amount (₹)">
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                className="admin-input"
              />
            </Field>
          </div>
          <Field label="Note (optional)">
            <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className="admin-input" />
          </Field>
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
