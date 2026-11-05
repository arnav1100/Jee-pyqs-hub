'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function GlobalBackButton() {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const previousPath = useRef('')
  const [backPath, setBackPath] = useState('')

  useEffect(() => {
    if (previousPath.current && previousPath.current !== pathname) setBackPath(previousPath.current)
    previousPath.current = pathname
  }, [pathname])

  if (pathname === '/') return null

  return <div className="mx-auto max-w-7xl px-4 pt-3"><button type="button" onClick={() => router.push(backPath || '/')} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-ink-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800" aria-label="Go back"><ArrowLeft size={14} /> Back</button></div>
}
