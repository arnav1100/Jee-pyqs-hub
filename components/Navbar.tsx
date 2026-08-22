'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, GraduationCap, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { logout } from '@/lib/firebase'
import { useSettings } from '@/lib/settings'
import AuthModal from './AuthModal'
import AdminLoginModal from './admin/AdminLoginModal'

const TAP_COUNT_REQUIRED = 5
const TAP_WINDOW_MS = 3000
const NAV_DEBOUNCE_MS = 320

export default function Navbar() {
  const { user, loading, access } = useAuth()
  const { settings } = useSettings()
  const router = useRouter()
  const [authOpen, setAuthOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  const tapTimestamps = useRef<number[]>([])
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleLogoClick(e: React.MouseEvent) {
    e.preventDefault()
    const now = Date.now()
    tapTimestamps.current = [...tapTimestamps.current, now].filter((t) => now - t <= TAP_WINDOW_MS)

    if (tapTimestamps.current.length >= TAP_COUNT_REQUIRED) {
      tapTimestamps.current = []
      if (navTimer.current) clearTimeout(navTimer.current)
      setAdminOpen(true)
      return
    }

    // Not (yet) a secret gesture — behave like a normal link, just slightly
    // debounced so we can keep counting taps without a full navigation
    // resetting the counter after the first click.
    if (navTimer.current) clearTimeout(navTimer.current)
    navTimer.current = setTimeout(() => {
      tapTimestamps.current = []
      router.push('/')
    }, NAV_DEBOUNCE_MS)
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 font-display font-bold text-ink-900"
            aria-label="Home"
          >
            <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-brand-600 text-white">
              {settings.logoUrl ? (
                <Image src={settings.logoUrl} alt="" width={32} height={32} className="h-full w-full object-cover" />
              ) : (
                <GraduationCap size={18} />
              )}
            </span>
            <span className="text-[15px] tracking-tight">{settings.siteName}</span>
          </button>

          {!loading && (
            <div className="flex items-center gap-2">
              {user && (
                <Link
                  href="/dashboard"
                  className="hidden items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-slate-50 sm:flex"
                >
                  My Progress
                </Link>
              )}
              {user && !access.isPremium && (
                <Link
                  href="/premium"
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    access.isTrialActive
                      ? 'border border-brand-200 text-brand-700 hover:bg-brand-50'
                      : 'bg-amber-100 text-moderate hover:bg-amber-200'
                  }`}
                >
                  <Crown size={13} />
                  {access.isTrialActive ? 'Trial' : 'Upgrade'}
                </Link>
              )}
              {user && access.isPremium && (
                <Link
                  href="/premium"
                  className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700"
                >
                  <Crown size={13} /> Premium
                </Link>
              )}
              {user ? (
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 py-1.5 pl-1.5 pr-3 text-sm font-medium text-ink-700 hover:bg-slate-50"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-brand-700">
                    <UserIcon size={14} />
                  </span>
                  <span className="hidden sm:inline">{user.displayName || user.email?.split('@')[0]}</span>
                  <LogOut size={14} className="text-slate-400" />
                </button>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 active:bg-brand-800"
                >
                  Sign in
                </button>
              )}
            </div>
          )}
        </div>
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <AdminLoginModal open={adminOpen} onClose={() => setAdminOpen(false)} />
    </>
  )
}
