'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, BookOpen, CheckCircle2, NotebookPen, Sparkles, Timer } from 'lucide-react'

const ITEMS = [
  { href: '/pyqs', label: 'PYQ', icon: BookOpen },
  { href: '/tests', label: 'Test', icon: CheckCircle2 },
  { href: '/mock-tests', label: 'Mock', icon: Timer },
  { href: '/smart-test', label: 'Smart', icon: Sparkles },
  { href: '/mistakes', label: 'Mistakes', icon: NotebookPen },
  { href: '/performance', label: 'Performance', icon: Activity },
]

export default function MobileBottomNav() {
  const pathname = usePathname() || '/'
  if (pathname.startsWith('/admin') || pathname === '/practice' || pathname.startsWith('/mock-tests/session')) return null

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-emerald-100 bg-white/95 px-1 pt-1.5 shadow-nav backdrop-blur md:hidden" aria-label="Study navigation">
      <div className="mx-auto grid max-w-lg grid-cols-6">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return <Link key={href} href={href} className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-semibold ${active ? 'text-brand-800' : 'text-slate-500'}`} aria-current={active ? 'page' : undefined} aria-label={href === '/performance' ? 'Performance report' : label}><Icon size={18} strokeWidth={active ? 2.4 : 1.8} /><span className={`truncate ${href === '/performance' ? 'text-[9px] tracking-tight' : ''}`}>{label}</span></Link>
        })}
      </div>
    </nav>
  )
}
