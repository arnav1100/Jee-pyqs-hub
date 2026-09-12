'use client'

import { useState } from 'react'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { logout } from '@/lib/firebase'
import AdminLoginModal from '@/components/admin/AdminLoginModal'
import AdminShell, { type AdminSection } from '@/components/admin/AdminShell'
import DashboardOverview from '@/components/admin/sections/DashboardOverview'
import SubjectsManager from '@/components/admin/sections/SubjectsManager'
import ChaptersManager from '@/components/admin/sections/ChaptersManager'
import QuestionsManager from '@/components/admin/sections/QuestionsManager'
import BulkImportManager from '@/components/admin/sections/BulkImportManager'
import UsersManager from '@/components/admin/sections/UsersManager'
import PaymentsManager from '@/components/admin/sections/PaymentsManager'
import SettingsManager from '@/components/admin/sections/SettingsManager'

export default function AdminPage() {
  const { user, loading, isAdmin, adminChecked } = useAuth()
  const [section, setSection] = useState<AdminSection>('dashboard')

  if (loading || !adminChecked) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 px-4">
        <div className="text-center">
          <p className="text-sm text-slate-500">Admin access required.</p>
        </div>
        <AdminLoginModal open onClose={() => {}} redirectOnSuccess={false} />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 px-4">
        <div className="max-w-sm text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50 text-difficult">
            <ShieldAlert size={22} />
          </span>
          <h1 className="font-display text-lg font-bold text-ink-900">Access denied</h1>
          <p className="mt-1 text-sm text-slate-500">
            This account is signed in but doesn't have admin access.
          </p>
          <button
            onClick={() => logout()}
            className="mt-4 rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <AdminShell active={section} onSelect={setSection}>
      {section === 'dashboard' && <DashboardOverview />}
      {section === 'subjects' && <SubjectsManager />}
      {section === 'chapters' && <ChaptersManager />}
      {section === 'questions' && <QuestionsManager />}
{section === 'bulk-import' && <BulkImportManager />}
      {section === 'users' && <UsersManager />}
      {section === 'payments' && <PaymentsManager />}
      {section === 'settings' && <SettingsManager />}
    </AdminShell>
  )
}
