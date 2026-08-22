'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react'
import { loginWithEmail, logout } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'

interface AdminLoginModalProps {
  open: boolean
  onClose: () => void
  /** If true, a successful admin login redirects to /admin. Used by the navbar gesture. */
  redirectOnSuccess?: boolean
}

export default function AdminLoginModal({ open, onClose, redirectOnSuccess = true }: AdminLoginModalProps) {
  const router = useRouter()
  const { refreshAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await loginWithEmail(email, password)
      const admin = await refreshAdmin()
      if (!admin) {
        await logout()
        setError('This account does not have admin access.')
        setBusy(false)
        return
      }
      onClose()
      setEmail('')
      setPassword('')
      if (redirectOnSuccess) router.push('/admin')
    } catch {
      setError('Invalid email or password.')
      setBusy(false)
      return
    }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-900/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-white">
              <ShieldCheck size={16} />
            </span>
            Admin Login
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-ink-900">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              autoFocus
              placeholder="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && <p className="text-xs font-medium text-difficult">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Sign in to Admin
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
          Admin access is granted separately via a Firebase custom claim — signing up here won't grant it.
        </p>
      </div>
    </div>
  )
}
