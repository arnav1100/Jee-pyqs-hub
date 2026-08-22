'use client'

import { useEffect, useState } from 'react'
import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, isConfigured } from './firebase'

export interface AttemptRecord {
  subjectSlug: string
  chapterSlug: string
  chapterName: string
  total: number
  correct: number
  wrong: number
  scorePct: number
}

/** Persists a completed timed-test attempt under users/{uid}/attempts, and
 * marks the chapter's progress doc as completed with a fresh answer tally
 * so the dashboard's "Completed Chapters" count stays accurate. */
export async function recordAttempt(uid: string, attempt: AttemptRecord) {
  const attemptRef = doc(collection(db, 'users', uid, 'attempts'))
  await setDoc(attemptRef, { ...attempt, createdAt: serverTimestamp() })

  const progressRef = doc(db, 'users', uid, 'progress', attempt.chapterSlug)
  await setDoc(
    progressRef,
    {
      completed: true,
      lastScorePct: attempt.scorePct,
      attemptedCount: attempt.total,
      correctCount: attempt.correct,
      wrongCount: attempt.wrong,
      updatedAt: Date.now(),
    },
    { merge: true }
  )
}

export interface UserStats {
  questionsAttempted: number
  correctAnswers: number
  wrongAnswers: number
  accuracyPct: number
  bookmarkedCount: number
  completedChapters: number
  loading: boolean
}

const EMPTY_STATS: UserStats = {
  questionsAttempted: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  accuracyPct: 0,
  bookmarkedCount: 0,
  completedChapters: 0,
  loading: true,
}

/**
 * Aggregates practice/test progress across all of a user's chapters:
 * questions attempted, correct/wrong counts, accuracy %, bookmarked
 * questions, and how many chapters they've completed a test in.
 * Reads users/{uid}/progress once (recomputed whenever `refreshKey`
 * changes) rather than a live listener, since it's a summary view.
 */
export function useUserStats(uid: string | undefined, refreshKey: number | string = 0): UserStats {
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!uid || !isConfigured) {
        setStats({ ...EMPTY_STATS, loading: false })
        return
      }
      setStats((s) => ({ ...s, loading: true }))
      try {
        const snap = await getDocs(collection(db, 'users', uid, 'progress'))
        let attempted = 0
        let correct = 0
        let wrong = 0
        let bookmarked = 0
        let completed = 0

        snap.docs.forEach((d) => {
          const data = d.data() as any
          const answers = (data.answers ?? {}) as Record<string, string>
          const answeredCount = Object.keys(answers).length
          attempted += typeof data.attemptedCount === 'number' ? data.attemptedCount : answeredCount
          if (typeof data.correctCount === 'number') correct += data.correctCount
          if (typeof data.wrongCount === 'number') wrong += data.wrongCount
          bookmarked += Array.isArray(data.bookmarked) ? data.bookmarked.length : 0
          if (data.completed) completed += 1
        })

        if (!cancelled) {
          setStats({
            questionsAttempted: attempted,
            correctAnswers: correct,
            wrongAnswers: wrong,
            accuracyPct: correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0,
            bookmarkedCount: bookmarked,
            completedChapters: completed,
            loading: false,
          })
        }
      } catch {
        if (!cancelled) setStats({ ...EMPTY_STATS, loading: false })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [uid, refreshKey])

  return stats
}
