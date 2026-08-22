'use client'

import { useState } from 'react'
import { Loader2, User as UserIcon } from 'lucide-react'
import { useAdminUsers, updateUserPlan, type AdminUser } from '@/lib/admin-data'

const PLAN_LABEL: Record<AdminUser['plan'], string> = {
  free: 'Free',
  monthly: 'Monthly',
  lifetime: 'Lifetime',
}

export default function UsersManager() {
  const { users, loading } = useAdminUsers()
  const [savingId, setSavingId] = useState<string | null>(null)

  async function handlePlanChange(uid: string, plan: AdminUser['plan']) {
    setSavingId(uid)
    try {
      await updateUserPlan(uid, plan, null)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">{users.length} registered user{users.length === 1 ? '' : 's'}</p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : users.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
          No users have signed up yet.
        </p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                <UserIcon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{u.displayName || u.email || 'Unnamed user'}</p>
                <p className="truncate text-xs text-slate-500">
                  {u.email}
                  {u.plan === 'monthly' && u.planExpiresAt
                    ? ` · expires ${new Date(u.planExpiresAt).toLocaleDateString()}`
                    : ''}
                  {u.plan === 'free' && u.trialEnd
                    ? new Date(u.trialEnd).getTime() > Date.now()
                      ? ` · trial ends ${new Date(u.trialEnd).toLocaleString()}`
                      : ' · trial expired'
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {savingId === u.id && <Loader2 size={14} className="animate-spin text-slate-400" />}
                <select
                  value={u.plan}
                  onChange={(e) => handlePlanChange(u.id, e.target.value as AdminUser['plan'])}
                  disabled={savingId === u.id}
                  className="admin-input w-auto py-1.5 text-xs"
                >
                  {(Object.keys(PLAN_LABEL) as AdminUser['plan'][]).map((p) => (
                    <option key={p} value={p}>
                      {PLAN_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
