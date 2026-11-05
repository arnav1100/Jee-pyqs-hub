'use client'

import { useEffect, useState } from 'react'
import { LockKeyhole, X } from 'lucide-react'

// Convenience gate only; /admin still enforces the Firebase admin custom claim.
const ADMIN_GATE_PASSCODE = 'arnav0011'

export default function AdminPasscodeModal({ open, onClose, onUnlock }: { open: boolean; onClose: () => void; onUnlock: () => void }) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setPasscode('')
      setError('')
    }
  }, [open])

  if (!open) return null

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (passcode === ADMIN_GATE_PASSCODE) {
      setError('')
      setPasscode('')
      onUnlock()
      return
    }
    setPasscode('')
    setError('Incorrect passcode. Try again.')
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="admin-gate-title" className="w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between"><h2 id="admin-gate-title" className="flex items-center gap-2 font-display text-lg font-bold text-ink-900"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700"><LockKeyhole size={16} /></span>Admin access</h2><button type="button" onClick={onClose} aria-label="Close admin passcode dialog" className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-ink-900"><X size={18} /></button></div>
        <form onSubmit={submit} className="space-y-3"><label htmlFor="admin-passcode" className="block text-xs font-semibold text-slate-600">Enter passcode</label><input id="admin-passcode" type="password" autoFocus autoComplete="current-password" required value={passcode} onChange={(event) => setPasscode(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="Passcode" />{error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}<button type="submit" className="w-full rounded-xl bg-brand-700 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800">Continue</button></form>
      </section>
    </div>
  )
}
