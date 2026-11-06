'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock3, Crown } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m left`
  const seconds = total % 60
  return `${minutes}m ${seconds}s left`
}

/**
 * Small, non-intrusive access badge in the navbar:
 * - trial running → shows the exact time left and links to /premium
 * - trial finished → "Free access ended · See plans"
 * - paid plan → "Premium"
 * Renders nothing for signed-out visitors, so the public site stays clean.
 */
export default function TrialBadge({ className = '' }: { className?: string }) {
  const { user, access, profile } = useAuth()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!user || !access.isTrialActive) return
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [user, access.isTrialActive])

  if (!user) return null

  if (access.isPremium) {
    return (
      <Link
        href="/premium"
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-easy ${className}`}
      >
        <Crown size={12} /> {profile?.plan === 'lifetime' ? 'Lifetime' : 'Premium'}
      </Link>
    )
  }

  if (access.isTrialActive && access.trialEnd) {
    return (
      <Link
        href="/premium"
        className={`inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-moderate ${className}`}
        title="Your free 24-hour access"
      >
        <Clock3 size={12} /> {formatRemaining(access.trialEnd.getTime() - now)}
      </Link>
    )
  }

  return (
    <Link
      href="/premium"
      className={`inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-difficult ${className}`}
    >
      <Clock3 size={12} /> Trial over · Plans
    </Link>
  )
}
