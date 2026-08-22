'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import AuthModal from './AuthModal'

/**
 * Wraps chapter/practice/test content. Renders children when the user has
 * an active 12h trial or an active paid plan; otherwise shows a locked
 * upsell pointing at /premium. Signed-out visitors are asked to sign in
 * first (which starts their trial).
 */
export default function PremiumGate({ children }: { children: React.ReactNode }) {
  const { user, loading, profileLoading, access } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)

  if (loading || (user && profileLoading)) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-slate-300" size={28} />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <LockedPanel
          title="Sign in to start your free trial"
          message="Create a free account to get 12 hours of full access to every chapter and question."
          ctaLabel="Sign in / Sign up"
          onCta={() => setAuthOpen(true)}
        />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    )
  }

  if (!access.hasAccess) {
    return (
      <LockedPanel
        title="Your free trial has ended"
        message="Upgrade to Monthly or Lifetime to unlock every chapter and question again."
        ctaLabel="View Premium Plans"
        href="/premium"
      />
    )
  }

  return <>{children}</>
}

function LockedPanel({
  title,
  message,
  ctaLabel,
  href,
  onCta,
}: {
  title: string
  message: string
  ctaLabel: string
  href?: string
  onCta?: () => void
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Lock size={24} />
      </span>
      <h1 className="font-display text-xl font-bold text-ink-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      {href ? (
        <Link
          href={href}
          className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {ctaLabel}
        </Link>
      ) : (
        <button
          onClick={onCta}
          className="mt-6 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
