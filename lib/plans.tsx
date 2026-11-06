'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, isConfigured } from './firebase'

/**
 * Subscription plans are fully admin-controlled: the admin panel writes them
 * to the public-read `settings/plans` document, and the /premium page simply
 * renders whatever is active. Nothing about pricing or plan length is
 * hard-coded in the storefront any more.
 */
export interface Plan {
  id: string
  name: string
  price: number
  /** 0 means lifetime (never expires). */
  durationDays: number
  /** Small suffix shown next to the price, e.g. "/ 30 days". */
  period: string
  features: string[]
  highlight: boolean
  active: boolean
}

export const PLAN_STORAGE_KEY = 'jee-pyq-hub:plans:v1'

export const DEFAULT_PLANS: Plan[] = [
  {
    id: 'monthly',
    name: 'Monthly Plan',
    price: 99,
    durationDays: 30,
    period: '/ 30 days',
    features: ['Full access to all chapters', 'Practice + timed tests', 'Bookmarks & progress tracking'],
    highlight: false,
    active: true,
  },
  {
    id: 'lifetime',
    name: 'Lifetime Plan',
    price: 499,
    durationDays: 0,
    period: 'one-time',
    features: ['Everything in Monthly', 'Access forever, no renewals', 'All future content included'],
    highlight: true,
    active: true,
  },
]

function readLocalPlans(): Plan[] {
  if (typeof window === 'undefined') return DEFAULT_PLANS
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY)
    if (!raw) return DEFAULT_PLANS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? (parsed as Plan[]) : DEFAULT_PLANS
  } catch {
    return DEFAULT_PLANS
  }
}

function writeLocalPlans(plans: Plan[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans))
  } catch {
    /* storage full / private mode — the in-memory copy still works */
  }
}

export function normalisePlans(value: unknown): Plan[] {
  if (!Array.isArray(value)) return DEFAULT_PLANS
  const plans = value
    .filter((item): item is Partial<Plan> => Boolean(item) && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id || `plan-${index + 1}`),
      name: String(item.name || 'Plan'),
      price: Number(item.price) || 0,
      durationDays: Math.max(0, Number(item.durationDays) || 0),
      period: String(item.period || (Number(item.durationDays) > 0 ? `/ ${item.durationDays} days` : 'one-time')),
      features: Array.isArray(item.features) ? item.features.map(String) : [],
      highlight: Boolean(item.highlight),
      active: item.active !== false,
    }))
  return plans.length ? plans : DEFAULT_PLANS
}

/** Live plan list for the storefront and the admin panel. */
export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    if (!isConfigured) {
      setPlans(readLocalPlans())
      setLoading(false)
      return
    }

    const ref = doc(db, 'settings', 'plans')
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (cancelled) return
        if (snap.exists()) {
          const data = snap.data() as { plans?: unknown }
          const next = normalisePlans(data.plans)
          setPlans(next)
          writeLocalPlans(next)
        } else {
          setPlans(readLocalPlans())
        }
        setLoading(false)
      },
      () => {
        if (cancelled) return
        setPlans(readLocalPlans())
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return { plans, loading }
}

/** Admin write: replaces the whole plan list (used by the Plans manager). */
export async function savePlans(plans: Plan[]) {
  writeLocalPlans(plans)
  if (!isConfigured) return
  try {
    await setDoc(doc(db, 'settings', 'plans'), { plans, updatedAt: serverTimestamp() })
  } catch {
    // Offline / rules not deployed yet — the localStorage copy keeps the
    // admin's edits visible on this device.
  }
}

/** Public plans only, cheapest first, for the /premium page. */
export function activePlans(plans: Plan[]) {
  return plans.filter((plan) => plan.active).slice().sort((a, b) => a.price - b.price)
}

/** Kept for backwards compatibility with older settings-based pricing. */
export async function readLegacyPlanPrices(): Promise<{ monthlyPrice?: number; lifetimePrice?: number }> {
  if (!isConfigured) return {}
  try {
    const snap = await getDoc(doc(db, 'settings', 'site'))
    if (!snap.exists()) return {}
    const data = snap.data() as { monthlyPrice?: number; lifetimePrice?: number }
    return { monthlyPrice: data.monthlyPrice, lifetimePrice: data.lifetimePrice }
  } catch {
    return {}
  }
}
