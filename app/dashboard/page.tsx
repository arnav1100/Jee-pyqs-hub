'use client'

import Link from 'next/link'
import { BarChart3, BookmarkCheck, CheckCircle2, Crown, Loader2, Target, XCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useUserStats } from '@/lib/stats'
import AuthModal from '@/components/AuthModal'
import { useState } from 'react'

const STAT_CARDS = [
  { key: 'questionsAttempted', label: 'Questions Attempted', icon: BarChart3, color: 'text-brand-600' },
  { key: 'correctAnswers', label: 'Correct Answers', icon: CheckCircle2, color: 'text-easy' },
  { key: 'wrongAnswers', label: 'Wrong Answers', icon: XCircle, color: 'text-difficult' },
  { key: 'accuracyPct', label: 'Accuracy %', icon: Target, color: 'text-moderate', suffix: '%' },
  { key: 'bookmarkedCount', label: 'Bookmarked Questions', icon: BookmarkCheck, color: 'text-brand-600' },
  { key: 'completedChapters', label: 'Completed Chapters', icon: CheckCircle2, color: 'text-easy' },
] as const

export default function DashboardPage() {
  const { user, loading, access } = useAuth()
  const stats = useUserStats(user?.uid)
  const [authOpen, setAuthOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-slate-300" size={28} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 text-center">
        <h1 className="font-display text-xl font-bold text-ink-900">Sign in to see your progress</h1>
        <p className="mt-2 text-sm text-slate-500">Track attempts, accuracy, bookmarks and completed chapters.</p>
        <button
          onClick={() => setAuthOpen(true)}
          className="mt-6 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Sign in
        </button>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-ink-900">My Progress</h1>
      <p className="mt-1 text-sm text-slate-500">{user.displayName || user.email}</p>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
        {access.isPremium ? (
          <>
            <Crown size={18} className="text-brand-600" />
            <span className="text-sm font-semibold text-ink-800">
              Premium active{access.planExpiresAt ? ` · until ${access.planExpiresAt.toLocaleDateString()}` : ' · Lifetime'}
            </span>
          </>
        ) : access.isTrialActive ? (
          <>
            <Crown size={18} className="text-moderate" />
            <span className="text-sm font-semibold text-ink-800">
              Free trial active{access.trialEnd ? ` · ends ${access.trialEnd.toLocaleTimeString()}` : ''}
            </span>
          </>
        ) : (
          <>
            <Crown size={18} className="text-slate-400" />
            <span className="text-sm font-semibold text-ink-800">No active plan</span>
            <Link href="/premium" className="ml-auto text-sm font-semibold text-brand-600 hover:underline">
              Upgrade
            </Link>
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.loading ? (
          <div className="col-span-full flex justify-center py-10">
            <Loader2 className="animate-spin text-slate-300" size={24} />
          </div>
        ) : (
          STAT_CARDS.map((s) => {
            const Icon = s.icon
            const value = stats[s.key as keyof typeof stats]
            return (
              <div key={s.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                <Icon size={16} className={s.color} />
                <div className="mt-2 font-display text-2xl font-bold text-ink-900">
                  {value}
                  {'suffix' in s ? s.suffix : ''}
                </div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
