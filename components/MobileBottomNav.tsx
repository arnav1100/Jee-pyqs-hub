'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, BookOpen, CheckCircle2, FolderOpen, NotebookPen, Sparkles, Timer } from 'lucide-react'

const ITEMS = [
  { href: '/pyqs', label: 'PYQ', icon: BookOpen },
  { href: '/tests', label: 'Test', icon: CheckCircle2 },
  { href: '/mock-tests', label: 'Mock', icon: Timer },
  { href: '/smart-test', label: 'Smart', icon: Sparkles },
  { href: '/mistakes', label: 'Mistakes', icon: NotebookPen },
  { href: '/performance', label: 'Performance', icon: Activity },
  { href: '/resources', label: 'Resources', icon: FolderOpen },
]

export default function MobileBottomNav() {
  const pathname = usePathname() || '/'
  // Hide the global study nav inside exam-like screens — those pages have
  // their own fixed action bar and a floating palette, and two bottom bars
  // overlapping was making the layout feel broken on phones.
  const isSessionRoute =
    pathname === '/practice' ||
    pathname.startsWith('/mock-tests/session') ||
    pathname.endsWith('/practice') ||
    (pathname.endsWith('/test') && pathname.split('/').filter(Boolean).length >= 4)
  if (pathname.startsWith('/admin') || isSessionRoute) return null

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-emerald-100 bg-white/95 px-1 pt-1.5 shadow-nav backdrop-blur md:hidden" aria-label="Study navigation">
      <div className="mx-auto grid max-w-xl grid-cols-7">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return <Link key={href} href={href} className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[9px] font-semibold sm:text-[10px] ${active ? 'text-brand-800' : 'text-slate-500'}`} aria-current={active ? 'page' : undefined} aria-label={href === '/performance' ? 'Performance report' : label}><Icon size={18} strokeWidth={active ? 2.4 : 1.8} /><span className="truncate tracking-tight">{label}</span></Link>
        })}
      </div>
    </nav>
  )
}
