'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const THEME_KEY = 'jee-pyq-hub:theme:v1'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_KEY)
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches || false
    const enabled = saved ? saved === 'dark' : prefersDark
    setDark(enabled)
    document.documentElement.classList.toggle('dark', enabled)
    document.documentElement.style.colorScheme = enabled ? 'dark' : 'light'
  }, [])

  function toggle() {
    setDark((value) => {
      const next = !value
      window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', next)
      document.documentElement.style.colorScheme = next ? 'dark' : 'light'
      return next
    })
  }

  return (
    <button onClick={toggle} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-ink-900" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
