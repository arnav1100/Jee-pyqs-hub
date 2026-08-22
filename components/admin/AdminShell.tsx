'use client'

import Link from 'next/link'
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  HelpCircle,
  Users,
  Wallet,
  Settings as SettingsIcon,
  LogOut,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { logout } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'

export type AdminSection =
  | 'dashboard'
  | 'subjects'
  | 'chapters'
  | 'questions'
  | 'users'
  | 'payments'
  | 'settings'

const NAV_ITEMS: { key: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
  { key: 'chapters', label: 'Chapters', icon: Layers },
  { key: 'questions', label: 'Questions', icon: HelpCircle },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'payments', label: 'Payments', icon: Wallet },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function AdminShell({
  active,
  onSelect,
  children,
}: {
  active: AdminSection
  onSelect: (s: AdminSection) => void
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeLabel = NAV_ITEMS.find((n) => n.key === active)?.label ?? ''

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-3 flex items-center gap-2 px-2 pt-1">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white font-display text-sm font-bold">
          A
        </span>
        <div>
          <p className="font-display text-sm font-bold text-white">Admin Panel</p>
          <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
        </div>
      </div>

      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = item.key === active
        return (
          <button
            key={item.key}
            onClick={() => {
              onSelect(item.key)
              setMobileOpen(false)
            }}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
              isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon size={16} />
            {item.label}
          </button>
        )
      })}

      <div className="mt-auto space-y-1 pt-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft size={16} /> Back to site
        </Link>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </nav>
  )

  return (
    <div className="flex min-h-dvh bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-ink-900 lg:block">{sidebar}</aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-ink-900">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <button className="text-ink-700 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <h1 className="font-display text-base font-bold text-ink-900">{activeLabel}</h1>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
