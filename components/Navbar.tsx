'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Activity, BookOpen, CheckCircle2, FolderOpen, GraduationCap, NotebookPen, Sparkles, Timer, User as UserIcon, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { logout } from '@/lib/firebase'
import { useSettings } from '@/lib/settings'
import AuthModal from './AuthModal'
import TrialBadge from './TrialBadge'
import AdminLoginModal from './admin/AdminLoginModal'
import AdminPasscodeModal from './admin/AdminPasscodeModal'

const NAV_ITEMS = [
  { href: '/pyqs', label: 'PYQ', icon: BookOpen },
  { href: '/tests', label: 'Tests', icon: CheckCircle2 },
  { href: '/mock-tests', label: 'Mock', icon: Timer },
  { href: '/smart-test', label: 'Smart test', icon: Sparkles },
  { href: '/mistakes', label: 'Mistake book', icon: NotebookPen },
  { href: '/performance', label: 'Performance', icon: Activity },
  { href: '/resources', label: 'Resources', icon: FolderOpen },
]

export default function Navbar() {
  const { user, loading, isAdmin } = useAuth()
  const { settings } = useSettings()
  const pathname = usePathname() || '/'
  const router = useRouter()
  const [authOpen, setAuthOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminGateOpen, setAdminGateOpen] = useState(false)
  const [showAdminButton, setShowAdminButton] = useState(false)
  const logoTapCount = useRef(0)
  const tapResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (tapResetTimer.current) clearTimeout(tapResetTimer.current)
  }, [])

  function handleLogoTap() {
    logoTapCount.current += 1
    if (tapResetTimer.current) clearTimeout(tapResetTimer.current)
    if (logoTapCount.current >= 5) {
      setShowAdminButton(true)
      logoTapCount.current = 0
      tapResetTimer.current = null
      return
    }
    tapResetTimer.current = setTimeout(() => { logoTapCount.current = 0 }, 3000)
  }

  function unlockAdmin() {
    setAdminGateOpen(false)
    if (isAdmin) router.push('/admin')
    else setAdminOpen(true)
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-5">
          <Link href="/" onClick={handleLogoTap} className="flex shrink-0 items-center gap-2 font-display font-extrabold text-ink-900" aria-label="JEE PYQ Hub home">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-2xl bg-brand-600 text-white shadow-sm">
              {settings.logoUrl ? <Image src={settings.logoUrl} alt="" width={36} height={36} className="h-full w-full object-cover" /> : <GraduationCap size={20} />}
            </span>
            <span className="text-[13px] tracking-tight sm:text-sm">{settings.siteName || 'JEE PYQ HUB'}</span>
          </Link>

          <nav className="ml-2 hidden items-center gap-0.5 md:flex" aria-label="Main navigation">
            {NAV_ITEMS.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined} className={`rounded-full px-2.5 py-2 text-[11px] font-bold transition lg:px-3 lg:text-xs ${pathname === href || pathname.startsWith(`${href}/`) ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-emerald-50 hover:text-brand-800'}`}>{label}</Link>)}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {showAdminButton && <button onClick={() => setAdminGateOpen(true)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-200 hover:text-brand-700">Admin</button>}
            {!loading && user && <TrialBadge className="hidden sm:inline-flex" />}
            {!loading && (user ? <><Link href="/dashboard" className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-800" aria-label="My progress"><UserIcon size={17} /></Link><button onClick={() => logout()} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Sign out"><LogOut size={15} /></button></> : <button onClick={() => setAuthOpen(true)} className="rounded-full bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 sm:px-4 sm:text-sm">Log in</button>)}
          </div>
        </div>
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <AdminPasscodeModal open={adminGateOpen} onClose={() => setAdminGateOpen(false)} onUnlock={unlockAdmin} />
      <AdminLoginModal open={adminOpen} onClose={() => setAdminOpen(false)} />
    </>
  )
}
