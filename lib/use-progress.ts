'use client'

import { useCallback, useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './auth-context'

export interface ChapterProgress {
  answers: Record<string, string> // questionId -> selected option id
  bookmarked: string[]
  lastQuestionIndex: number
  updatedAt: number
  // Aggregate counters kept in sync with `answers`/test attempts, read by
  // lib/stats.ts#useUserStats to power the "My Progress" dashboard.
  attemptedCount?: number
  correctCount?: number
  wrongCount?: number
  completed?: boolean
  lastScorePct?: number
}

const emptyProgress: ChapterProgress = {
  answers: {},
  bookmarked: [],
  lastQuestionIndex: 0,
  updatedAt: Date.now(),
}

function localKey(chapterId: string) {
  return `jee-pyq-hub:progress:${chapterId}`
}

// Auto-saves practice progress. Writes to Firestore under
// users/{uid}/progress/{chapterId} when signed in, and always mirrors to
// localStorage so practice works offline / while logged out.
export function useProgress(chapterId: string) {
  const { user } = useAuth()
  const [progress, setProgress] = useState<ChapterProgress>(emptyProgress)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const local = typeof window !== 'undefined' ? window.localStorage.getItem(localKey(chapterId)) : null
      let next = local ? (JSON.parse(local) as ChapterProgress) : emptyProgress

      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid, 'progress', chapterId))
          if (snap.exists()) {
            const remote = snap.data() as ChapterProgress
            if (!local || remote.updatedAt > next.updatedAt) next = remote
          }
        } catch {
          // offline or not configured yet — local copy still works
        }
      }

      if (!cancelled) {
        setProgress(next)
        setHydrated(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [chapterId, user])

  const save = useCallback(
    (updater: (prev: ChapterProgress) => ChapterProgress) => {
      setProgress((prev) => {
        const next = { ...updater(prev), updatedAt: Date.now() }
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(localKey(chapterId), JSON.stringify(next))
        }
        if (user) {
          setDoc(doc(db, 'users', user.uid, 'progress', chapterId), next).catch(() => {})
        }
        return next
      })
    },
    [chapterId, user]
  )

  return { progress, save, hydrated }
}
