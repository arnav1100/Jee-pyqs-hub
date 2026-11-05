'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, isConfigured } from './firebase'
import { useAuth } from './auth-context'
import { useQuestionLibrary, type QuestionLibraryItem } from './question-library'

export interface StudyAttempt {
  id: string
  questionId: string
  selectedAnswer: string
  correct: boolean
  occurredAt: number
  elapsedSeconds: number
  examType: string
  year: number
  subjectSlug: string
  subjectName: string
  chapterSlug: string
  chapterName: string
  difficulty: string
}

export interface MistakeEntry {
  questionId: string
  previousWrongAnswer: string
  failedCount: number
  lastAttemptAt: number
  status: 'needs-revision' | 'mastered'
  lastCorrectAt?: number
}

export interface StudyReport {
  id: string
  questionId: string
  reason: string
  createdAt: number
}

export interface StudyTestResult {
  id: string
  kind: 'chapter-test' | 'subject-test' | 'full-test' | 'mock' | 'smart'
  examName: string
  mode: 'practice' | 'test'
  subjectName?: string
  chapterName?: string
  totalQuestions: number
  attempted: number
  correct: number
  wrong: number
  unattempted: number
  marks: number
  maxMarks: number
  accuracy: number
  elapsedSeconds: number
  completedAt: number
}

export interface StudyData {
  attempts: StudyAttempt[]
  bookmarks: string[]
  mistakes: Record<string, MistakeEntry>
  notes: Record<string, string>
  collections: Record<string, string[]>
  reviewed: string[]
  studyDates: string[]
  reports: StudyReport[]
  testResults: StudyTestResult[]
  dailyGoal: number
  updatedAt: number
}

interface StudyDataContextValue extends StudyData {
  hydrated: boolean
  streak: number
  todaySolved: number
  todayGoalProgress: number
  totalStudySeconds: number
  recordAnswer: (question: QuestionLibraryItem, answer: string, elapsedSeconds?: number) => void
  toggleBookmark: (questionId: string) => void
  markMistakeMastered: (questionId: string) => void
  setQuestionNote: (questionId: string, note: string) => void
  createCollection: (name: string) => void
  toggleCollectionQuestion: (name: string, questionId: string) => void
  setDailyGoal: (goal: number) => void
  toggleReview: (questionId: string) => void
  reportQuestion: (questionId: string, reason: string) => void
  recordTestResult: (result: StudyTestResult) => void
}

const STUDY_STORAGE_KEY = 'jee-pyq-hub:study:v1'
const STUDY_DOC_ID = 'summary'
const EMPTY_DATA: StudyData = {
  attempts: [],
  bookmarks: [],
  mistakes: {},
  notes: {},
  collections: {},
  reviewed: [],
  studyDates: [],
  reports: [],
  testResults: [],
  dailyGoal: 20,
  updatedAt: 0,
}

const StudyDataContext = createContext<StudyDataContextValue | null>(null)

function todayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function asStudyData(value: unknown): StudyData {
  if (!value || typeof value !== 'object') return { ...EMPTY_DATA }
  const raw = value as Partial<StudyData>
  return {
    attempts: Array.isArray(raw.attempts) ? raw.attempts.filter((attempt): attempt is StudyAttempt => Boolean(attempt && attempt.questionId)) : [],
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks.filter((id): id is string => typeof id === 'string') : [],
    mistakes: raw.mistakes && typeof raw.mistakes === 'object' ? raw.mistakes : {},
    notes: raw.notes && typeof raw.notes === 'object' ? raw.notes : {},
    collections: raw.collections && typeof raw.collections === 'object' ? raw.collections : {},
    reviewed: Array.isArray(raw.reviewed) ? raw.reviewed.filter((id): id is string => typeof id === 'string') : [],
    studyDates: Array.isArray(raw.studyDates) ? raw.studyDates.filter((date): date is string => typeof date === 'string') : [],
    reports: Array.isArray(raw.reports) ? raw.reports : [],
    testResults: Array.isArray(raw.testResults) ? raw.testResults.filter((result): result is StudyTestResult => Boolean(result && typeof result.id === 'string')).slice(-200) : [],
    dailyGoal: Math.max(1, Math.min(300, Number(raw.dailyGoal) || EMPTY_DATA.dailyGoal)),
    updatedAt: Number(raw.updatedAt) || 0,
  }
}

function answerIsCorrect(question: QuestionLibraryItem, answer: string) {
  if (!answer) return false
  if (question.questionType === 'numerical') {
    if (question.correctAnswer === undefined) return false
    const number = Number(answer)
    const tolerance = question.answerTolerance ?? 0.01
    return Number.isFinite(number) && Math.abs(number - question.correctAnswer) <= tolerance
  }
  return answer.trim().toUpperCase() === question.correctOptionId
}

function migrateLegacyProgress(data: StudyData, questions: QuestionLibraryItem[]) {
  if (typeof window === 'undefined') return data
  const byId = new Map(questions.map((question) => [question.id, question]))
  const attempts = [...data.attempts]
  const bookmarks = new Set(data.bookmarks)
  const mistakes = { ...data.mistakes }
  const studyDates = new Set(data.studyDates)
  const knownIds = new Set(attempts.map((attempt) => attempt.questionId))

  try {
    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index)
      if (!key?.startsWith('jee-pyq-hub:progress:')) continue
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      try {
        const progress = JSON.parse(raw) as {
          answers?: Record<string, string>
          bookmarked?: string[]
          updatedAt?: number
        }
        const updatedAt = Number(progress.updatedAt) || Date.now()
        const occurredAt = updatedAt
        const date = todayKey(new Date(occurredAt))
        const chapterSlug = key.slice('jee-pyq-hub:progress:'.length)
        for (const [questionId, answer] of Object.entries(progress.answers || {})) {
          const question = byId.get(questionId)
          if (!question || !answer || knownIds.has(questionId)) continue
          attempts.push({
            id: `legacy-${questionId}-${updatedAt}`,
            questionId,
            selectedAnswer: answer,
            correct: answerIsCorrect(question, answer),
            occurredAt,
            elapsedSeconds: 0,
            examType: question.examType,
            year: question.year,
            subjectSlug: question.subjectSlug,
            subjectName: question.subjectName,
            chapterSlug: question.chapterSlug || chapterSlug,
            chapterName: question.chapterName,
            difficulty: question.difficulty,
          })
          knownIds.add(questionId)
          if (!answerIsCorrect(question, answer)) {
            mistakes[questionId] = {
              questionId,
              previousWrongAnswer: answer,
              failedCount: Math.max(1, mistakes[questionId]?.failedCount || 0),
              lastAttemptAt: occurredAt,
              status: 'needs-revision',
            }
          }
          studyDates.add(date)
        }
        ;(progress.bookmarked || []).forEach((id) => bookmarks.add(id))
      } catch {
        // A malformed legacy progress value should never block the rest of the migration.
      }
    }
  } catch {
    // localStorage may be unavailable in a private browsing mode.
  }

  return { ...data, attempts, bookmarks: Array.from(bookmarks), mistakes, studyDates: Array.from(studyDates) }
}

function mergeStudyData(local: StudyData, remote: StudyData): StudyData {
  const attemptsById = new Map<string, StudyAttempt>()
  ;[...local.attempts, ...remote.attempts].forEach((attempt, index) => {
    const key = attempt.id || `${attempt.questionId}-${attempt.occurredAt}-${index}`
    attemptsById.set(key, attempt)
  })
  const localIsNewer = local.updatedAt >= remote.updatedAt
  const base = localIsNewer ? local : remote
  const mistakes: Record<string, MistakeEntry> = { ...remote.mistakes }
  Object.entries(local.mistakes).forEach(([id, entry]) => {
    const previous = mistakes[id]
    if (!previous || entry.lastAttemptAt >= previous.lastAttemptAt) {
      mistakes[id] = { ...entry, failedCount: Math.max(entry.failedCount, previous?.failedCount || 0) }
    } else {
      mistakes[id] = { ...previous, failedCount: Math.max(entry.failedCount, previous.failedCount) }
    }
  })
  const testResultsById = new Map<string, StudyTestResult>()
  ;[...local.testResults, ...remote.testResults].forEach((result) => {
    const previous = testResultsById.get(result.id)
    if (!previous || result.completedAt >= previous.completedAt) testResultsById.set(result.id, result)
  })
  return {
    ...base,
    attempts: Array.from(attemptsById.values()).sort((a, b) => a.occurredAt - b.occurredAt).slice(-10000),
    bookmarks: Array.from(new Set(base.bookmarks)),
    mistakes,
    notes: { ...remote.notes, ...(localIsNewer ? local.notes : {}) },
    collections: Object.fromEntries(Array.from(new Set([...Object.keys(local.collections), ...Object.keys(remote.collections)])).map((name) => [name, Array.from(new Set([...(local.collections[name] || []), ...(remote.collections[name] || [])]))])),
    reviewed: Array.from(new Set(base.reviewed)),
    studyDates: Array.from(new Set([...local.studyDates, ...remote.studyDates])).sort(),
    reports: [...local.reports, ...remote.reports].filter((report, index, list) => list.findIndex((candidate) => candidate.id === report.id) === index).slice(-1000),
    testResults: Array.from(testResultsById.values()).sort((a, b) => a.completedAt - b.completedAt).slice(-200),
    dailyGoal: base.dailyGoal,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  }
}

function currentStreak(studyDates: string[]) {
  const dates = new Set(studyDates)
  const today = todayKey()
  const cursor = new Date()
  if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1)
  let count = 0
  while (dates.has(todayKey(cursor))) {
    count++
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

export function StudyDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { questions } = useQuestionLibrary()
  const [data, setData] = useState<StudyData>(EMPTY_DATA)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      let local = { ...EMPTY_DATA }
      try {
        const raw = window.localStorage.getItem(STUDY_STORAGE_KEY)
        if (raw) local = asStudyData(JSON.parse(raw))
      } catch {
        // Keep the local fallback empty if browser storage contains invalid JSON.
      }
      local = migrateLegacyProgress(local, questions)
      let next = local

      if (user && isConfigured) {
        try {
          const snapshot = await getDoc(doc(db, 'users', user.uid, 'studyData', STUDY_DOC_ID))
          if (snapshot.exists()) next = mergeStudyData(local, asStudyData(snapshot.data()))
        } catch {
          // Offline: keep the local copy so the student can continue immediately.
        }
      }

      if (cancelled) return
      setData(next)
      setHydrated(true)
      try {
        window.localStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Storage quota/private mode should not block studying.
      }
    }
    setHydrated(false)
    void load()
    return () => { cancelled = true }
  }, [user, questions])

  const persist = useCallback((updater: (previous: StudyData) => StudyData) => {
    setData((previous) => {
      const next = { ...updater(previous), updatedAt: Date.now() }
      try {
        window.localStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Continue in memory if local storage is full or unavailable.
      }
      if (user && isConfigured) {
        setDoc(doc(db, 'users', user.uid, 'studyData', STUDY_DOC_ID), next, { merge: true }).catch(() => {})
      }
      return next
    })
  }, [user])

  const recordAnswer = useCallback((question: QuestionLibraryItem, answer: string, elapsedSeconds = 0) => {
    if (!answer.trim()) return
    const correct = answerIsCorrect(question, answer)
    const occurredAt = Date.now()
    const attempt: StudyAttempt = {
      id: `${occurredAt}-${Math.random().toString(36).slice(2, 8)}`,
      questionId: question.id,
      selectedAnswer: answer,
      correct,
      occurredAt,
      elapsedSeconds: Math.max(0, Math.round(elapsedSeconds)),
      examType: question.examType,
      year: question.year,
      subjectSlug: question.subjectSlug,
      subjectName: question.subjectName,
      chapterSlug: question.chapterSlug,
      chapterName: question.chapterName,
      difficulty: question.difficulty,
    }
    persist((previous) => {
      const mistakes = { ...previous.mistakes }
      const oldMistake = mistakes[question.id]
      if (!correct) {
        mistakes[question.id] = {
          questionId: question.id,
          previousWrongAnswer: answer,
          failedCount: (oldMistake?.failedCount || 0) + 1,
          lastAttemptAt: occurredAt,
          status: 'needs-revision',
        }
      } else if (oldMistake) {
        mistakes[question.id] = { ...oldMistake, lastCorrectAt: occurredAt }
      }
      return {
        ...previous,
        attempts: [...previous.attempts, attempt].slice(-10000),
        mistakes,
        studyDates: Array.from(new Set([...previous.studyDates, todayKey(new Date(occurredAt))])).sort(),
      }
    })
  }, [persist])

  const recordTestResult = useCallback((result: StudyTestResult) => {
    persist((previous) => ({
      ...previous,
      testResults: [...previous.testResults.filter((item) => item.id !== result.id), result]
        .sort((a, b) => a.completedAt - b.completedAt)
        .slice(-200),
    }))
  }, [persist])

  const toggleBookmark = useCallback((questionId: string) => {
    persist((previous) => ({
      ...previous,
      bookmarks: previous.bookmarks.includes(questionId)
        ? previous.bookmarks.filter((id) => id !== questionId)
        : [...previous.bookmarks, questionId],
    }))
  }, [persist])

  const markMistakeMastered = useCallback((questionId: string) => {
    persist((previous) => previous.mistakes[questionId]
      ? { ...previous, mistakes: { ...previous.mistakes, [questionId]: { ...previous.mistakes[questionId], status: 'mastered' } } }
      : previous)
  }, [persist])

  const setQuestionNote = useCallback((questionId: string, note: string) => {
    persist((previous) => {
      const notes = { ...previous.notes }
      if (note.trim()) notes[questionId] = note
      else delete notes[questionId]
      return { ...previous, notes }
    })
  }, [persist])

  const createCollection = useCallback((name: string) => {
    const cleanName = name.trim().slice(0, 48)
    if (!cleanName) return
    persist((previous) => ({ ...previous, collections: { ...previous.collections, [cleanName]: previous.collections[cleanName] || [] } }))
  }, [persist])

  const toggleCollectionQuestion = useCallback((name: string, questionId: string) => {
    persist((previous) => {
      const current = previous.collections[name] || []
      const next = current.includes(questionId) ? current.filter((id) => id !== questionId) : [...current, questionId]
      return { ...previous, collections: { ...previous.collections, [name]: next } }
    })
  }, [persist])

  const setDailyGoal = useCallback((goal: number) => {
    persist((previous) => ({ ...previous, dailyGoal: Math.max(1, Math.min(300, Math.round(goal || 1))) }))
  }, [persist])

  const toggleReview = useCallback((questionId: string) => {
    persist((previous) => ({
      ...previous,
      reviewed: previous.reviewed.includes(questionId)
        ? previous.reviewed.filter((id) => id !== questionId)
        : [...previous.reviewed, questionId],
    }))
  }, [persist])

  const reportQuestion = useCallback((questionId: string, reason: string) => {
    const reportId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    persist((previous) => ({
      ...previous,
      reports: [...previous.reports, { id: reportId, questionId, reason, createdAt: Date.now() }].slice(-1000),
    }))
    if (user && isConfigured) {
      setDoc(doc(collection(db, 'questionReports')), { uid: user.uid, questionId, reason, createdAt: serverTimestamp() }).catch(() => {})
    }
  }, [persist, user])

  const todaySolved = data.attempts.filter((attempt) => todayKey(new Date(attempt.occurredAt)) === todayKey()).length
  const totalStudySeconds = data.attempts.reduce((sum, attempt) => sum + (attempt.elapsedSeconds || 0), 0)
  const value = useMemo<StudyDataContextValue>(() => ({
    ...data,
    hydrated,
    streak: currentStreak(data.studyDates),
    todaySolved,
    todayGoalProgress: Math.min(100, Math.round((todaySolved / Math.max(data.dailyGoal, 1)) * 100)),
    totalStudySeconds,
    recordAnswer,
    toggleBookmark,
    markMistakeMastered,
    setQuestionNote,
    createCollection,
    toggleCollectionQuestion,
    setDailyGoal,
    toggleReview,
    reportQuestion,
    recordTestResult,
  }), [data, hydrated, todaySolved, totalStudySeconds, recordAnswer, toggleBookmark, markMistakeMastered, setQuestionNote, createCollection, toggleCollectionQuestion, setDailyGoal, toggleReview, reportQuestion, recordTestResult])

  return <StudyDataContext.Provider value={value}>{children}</StudyDataContext.Provider>
}

export function useStudyData() {
  const value = useContext(StudyDataContext)
  if (!value) throw new Error('useStudyData must be used inside StudyDataProvider.')
  return value
}

export function isStudyAnswerCorrect(question: QuestionLibraryItem, answer: string) {
  return answerIsCorrect(question, answer)
}
