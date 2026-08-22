'use client'

import { BookOpen, Layers, HelpCircle, Users, Wallet, Clock } from 'lucide-react'
import { useAdminOverview } from '@/lib/admin-data'

export default function DashboardOverview() {
  const stats = useAdminOverview()

  const cards = [
    { label: 'Subjects', value: stats.totalSubjects, icon: BookOpen },
    { label: 'Chapters', value: stats.totalChapters, icon: Layers },
    { label: 'Questions', value: stats.totalQuestions, icon: HelpCircle },
    { label: 'Users', value: stats.totalUsers, icon: Users },
    { label: 'Paid Users', value: stats.paidUsers, icon: Wallet },
    { label: 'Pending Payments', value: stats.pendingPayments, icon: Clock },
  ]

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        Live snapshot of your content and community. Numbers update automatically as you edit content or
        payments come in.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <span className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <c.icon size={18} />
            </span>
            <div className="font-display text-2xl font-bold text-ink-900">{c.value.toLocaleString()}</div>
            <div className="text-xs text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
