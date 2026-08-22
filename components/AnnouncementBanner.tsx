'use client'

import { useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { useSettings } from '@/lib/settings'

export default function AnnouncementBanner() {
  const { settings } = useSettings()
  const [dismissed, setDismissed] = useState(false)

  if (!settings.announcement.active || !settings.announcement.text || dismissed) return null

  return (
    <div className="relative flex items-center justify-center gap-2 bg-ink-900 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
      <Megaphone size={14} className="shrink-0 text-brand-300" />
      <span className="max-w-4xl">{settings.announcement.text}</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-3 text-white/60 hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  )
}
