'use client'

import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, isConfigured } from './firebase'

export interface SiteSettings {
  siteName: string
  logoUrl: string
  qrImageUrl: string
  upiId: string
  paymentLink: string
  monthlyPrice: number
  lifetimePrice: number
  announcement: {
    text: string
    active: boolean
  }
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'JEE PYQ Hub',
  logoUrl: '',
  qrImageUrl: '',
  upiId: '',
  paymentLink: '',
  monthlyPrice: 0,
  lifetimePrice: 0,
  announcement: { text: '', active: false },
}

const SETTINGS_DOC = ['settings', 'site'] as const

/** Live site settings for use anywhere in the app (Navbar, banners, pricing, etc). */
export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }
    const ref = doc(db, ...SETTINGS_DOC)
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...(snap.data() as Partial<SiteSettings>) })
        }
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsubscribe()
  }, [])

  return { settings, loading }
}

export async function updateSettings(partial: Partial<SiteSettings>) {
  const ref = doc(db, ...SETTINGS_DOC)
  await setDoc(ref, { ...partial, updatedAt: serverTimestamp() }, { merge: true })
}
