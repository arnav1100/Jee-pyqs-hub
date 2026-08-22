'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore'
import { subscribeToAuth, checkIsAdmin, db, isConfigured, type User } from './firebase'

export const TRIAL_DURATION_MS = 12 * 60 * 60 * 1000 // 12 hour free trial

export type PlanId = 'free' | 'monthly' | 'lifetime'

export interface UserProfile {
  email: string | null
  displayName: string | null
  photoURL: string | null
  plan: PlanId
  planExpiresAt: string | null // ISO string, null = no expiry (lifetime) or not on a paid plan
  trialStart: string | null // ISO string
  trialEnd: string | null // ISO string
}

interface AccessStatus {
  /** True if the user currently has full access (active trial OR active paid plan). */
  hasAccess: boolean
  /** True while still inside the 12h free trial window. */
  isTrialActive: boolean
  /** True if plan is 'lifetime', or 'monthly' with a non-expired planExpiresAt. */
  isPremium: boolean
  trialEnd: Date | null
  planExpiresAt: Date | null
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAdmin: boolean
  adminChecked: boolean
  refreshAdmin: () => Promise<boolean>
  profile: UserProfile | null
  profileLoading: boolean
  access: AccessStatus
}

const NO_ACCESS: AccessStatus = {
  hasAccess: false,
  isTrialActive: false,
  isPremium: false,
  trialEnd: null,
  planExpiresAt: null,
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
  adminChecked: false,
  refreshAdmin: async () => false,
  profile: null,
  profileLoading: true,
  access: NO_ACCESS,
})

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Timestamp) return value.toDate()
  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

/** Computes trial/plan access from a raw Firestore user profile snapshot. */
export function computeAccess(data: Partial<UserProfile> | null | undefined): AccessStatus {
  if (!data) return NO_ACCESS

  const trialEnd = toDate(data.trialEnd)
  const isTrialActive = Boolean(trialEnd && trialEnd.getTime() > Date.now())

  const planExpiresAt = toDate(data.planExpiresAt)
  const isPremium =
    data.plan === 'lifetime' || (data.plan === 'monthly' && Boolean(planExpiresAt && planExpiresAt.getTime() > Date.now()))

  return {
    hasAccess: isTrialActive || isPremium,
    isTrialActive,
    isPremium,
    trialEnd,
    planExpiresAt,
  }
}

// Creates/updates the user's profile doc so the admin panel's Users section
// has something to list, and activates the 12-hour free trial for brand new
// accounts. Never blocks the UI — failures are swallowed.
async function upsertUserProfile(user: User) {
  if (!isConfigured) return
  try {
    const ref = doc(db, 'users', user.uid)
    const existing = await getDoc(ref)

    if (existing.exists()) {
      await setDoc(
        ref,
        {
          email: user.email ?? null,
          displayName: user.displayName ?? null,
          photoURL: user.photoURL ?? null,
          lastLoginAt: serverTimestamp(),
        },
        { merge: true }
      )
      return
    }

    // Brand new user — activate the 12 hour free trial.
    const now = new Date()
    const trialEnd = new Date(now.getTime() + TRIAL_DURATION_MS)
    await setDoc(ref, {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      plan: 'free',
      planExpiresAt: null,
      trialStart: now.toISOString(),
      trialEnd: trialEnd.toISOString(),
    })
  } catch {
    // Non-fatal — e.g. offline, or Firestore rules not deployed yet.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const refreshAdmin = useCallback(async () => {
    const admin = await checkIsAdmin(user, true)
    setIsAdmin(admin)
    setAdminChecked(true)
    return admin
  }, [user])

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (u) => {
      setUser(u)
      setLoading(false)
      if (u) {
        await upsertUserProfile(u)
        const admin = await checkIsAdmin(u, false)
        setIsAdmin(admin)
      } else {
        setIsAdmin(false)
        setProfile(null)
        setProfileLoading(false)
      }
      setAdminChecked(true)
    })
    return () => unsubscribe()
  }, [])

  // Live-subscribe to the user's own profile doc so trial/plan status,
  // and admin-side plan approvals, reflect instantly in the UI.
  useEffect(() => {
    if (!user || !isConfigured) {
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    const ref = doc(db, 'users', user.uid)
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
        setProfileLoading(false)
      },
      () => setProfileLoading(false)
    )
    return () => unsubscribe()
  }, [user?.uid])

  const access = computeAccess(profile)

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, adminChecked, refreshAdmin, profile, profileLoading, access }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
