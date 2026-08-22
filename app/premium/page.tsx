'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Clock, Crown, ExternalLink, Loader2, XCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useSettings } from '@/lib/settings'
import { useMyPayments } from '@/lib/admin-data'
import PaymentFormModal from '@/components/PaymentFormModal'
import AuthModal from '@/components/AuthModal'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-moderate',
  verified: 'bg-emerald-50 text-easy',
  rejected: 'bg-red-50 text-difficult',
}

const STATUS_ICON: Record<string, typeof Clock> = {
  pending: Clock,
  verified: CheckCircle2,
  rejected: XCircle,
}

export default function PremiumPage() {
  const { user, access } = useAuth()
  const { settings, loading: settingsLoading } = useSettings()
  const { payments } = useMyPayments(user?.uid)
  const [authOpen, setAuthOpen] = useState(false)
  const [formPlan, setFormPlan] = useState<'monthly' | 'lifetime' | null>(null)

  function handlePay(plan: 'monthly' | 'lifetime') {
    if (!user) {
      setAuthOpen(true)
      return
    }
    setFormPlan(plan)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white">
          <Crown size={22} />
        </span>
        <h1 className="font-display text-2xl font-bold text-ink-900">Go Premium</h1>
        <p className="mt-1 text-sm text-slate-500">
          {access.isTrialActive
            ? 'Your free trial is active. Upgrade any time to keep access after it ends.'
            : 'Your free trial has ended. Upgrade to unlock every chapter and question.'}
        </p>
      </div>

      {access.isPremium && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-sm font-semibold text-easy">
          <CheckCircle2 size={18} />
          You already have an active premium plan
          {access.planExpiresAt ? ` — renews/expires ${access.planExpiresAt.toLocaleDateString()}.` : ' — lifetime access.'}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PlanCard
          title="Monthly Plan"
          price={settings.monthlyPrice}
          period="/ 30 days"
          features={['Full access to all chapters', 'Practice + Timed tests', 'Bookmarks & progress tracking']}
          onSelect={() => handlePay('monthly')}
          loading={settingsLoading}
        />
        <PlanCard
          title="Lifetime Plan"
          price={settings.lifetimePrice}
          period="one-time"
          highlight
          features={['Everything in Monthly', 'Access forever, no renewals', 'All future content included']}
          onSelect={() => handlePay('lifetime')}
          loading={settingsLoading}
        />
      </div>

      <div className="mt-8 rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="font-display text-sm font-bold text-ink-900">How to pay</h2>
        <ol className="mt-2 space-y-1 text-sm text-slate-600">
          <li>1. Scan the QR code or pay via UPI ID below.</li>
          <li>2. Note your Transaction ID / UTR number.</li>
          <li>3. Tap a plan above, then submit the "I Have Paid" form with a screenshot.</li>
          <li>4. Admin verifies your payment and your plan activates automatically.</li>
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-5">
          {settings.qrImageUrl && (
            <Image
              src={settings.qrImageUrl}
              alt="Payment QR code"
              width={140}
              height={140}
              className="rounded-xl border border-slate-200 object-contain"
            />
          )}
          <div className="space-y-2 text-sm">
            {settings.upiId && (
              <p>
                <span className="font-semibold text-ink-900">UPI ID:</span> {settings.upiId}
              </p>
            )}
            {settings.paymentLink && (
              <a
                href={settings.paymentLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-semibold text-brand-600 hover:underline"
              >
                Open payment link <ExternalLink size={14} />
              </a>
            )}
            {!settings.qrImageUrl && !settings.upiId && !settings.paymentLink && (
              <p className="text-slate-400">Payment details haven't been added by the admin yet.</p>
            )}
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-display text-sm font-bold text-ink-900">Your requests</h2>
          <div className="space-y-2">
            {payments.map((p) => {
              const Icon = STATUS_ICON[p.status] ?? Clock
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm"
                >
                  <Icon size={16} className="shrink-0 text-slate-400" />
                  <span className="flex-1 text-ink-800">
                    {p.plan === 'monthly' ? 'Monthly' : 'Lifetime'} · ₹{p.amount}
                    {p.transactionId ? ` · Txn ${p.transactionId}` : ''}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[p.status]}`}>
                    {p.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      {formPlan && (
        <PaymentFormModal
          open
          plan={formPlan}
          amount={formPlan === 'monthly' ? settings.monthlyPrice : settings.lifetimePrice}
          onClose={() => setFormPlan(null)}
        />
      )}
    </div>
  )
}

function PlanCard({
  title,
  price,
  period,
  features,
  onSelect,
  highlight,
  loading,
}: {
  title: string
  price: number
  period: string
  features: string[]
  onSelect: () => void
  highlight?: boolean
  loading?: boolean
}) {
  return (
    <div
      className={`rounded-xl2 border p-5 shadow-card ${
        highlight ? 'border-brand-500 bg-brand-50/40' : 'border-slate-200 bg-white'
      }`}
    >
      {highlight && (
        <span className="mb-2 inline-block rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
          BEST VALUE
        </span>
      )}
      <h3 className="font-display text-base font-bold text-ink-900">{title}</h3>
      <p className="mt-1 font-display text-3xl font-extrabold text-ink-900">
        {loading ? <Loader2 className="animate-spin text-slate-300" size={22} /> : `₹${price}`}
        <span className="ml-1 text-sm font-medium text-slate-400">{period}</span>
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-easy" /> {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onSelect}
        className={`mt-5 w-full rounded-xl py-2.5 text-sm font-semibold ${
          highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border-2 border-brand-600 text-brand-700 hover:bg-brand-50'
        }`}
      >
        I Have Paid
      </button>
    </div>
  )
}
