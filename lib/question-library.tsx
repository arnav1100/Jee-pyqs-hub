'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Timestamp,
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db, isConfigured } from './firebase'
import {
  chapters as sampleChapters,
  questions as sampleQuestions,
  subjects as sampleSubjects,
  type Difficulty,
  type Question,
} from '@/data/mockData'

export type QuestionSource = 'firestore' | 'static' | 'local' | 'sample'

export interface QuestionLibraryItem extends Question {
  subjectId: string
  subjectSlug: string
  subjectName: string
  chapterId?: string
  chapterName: string
  topic?: string
  solutionImageUrl?: string
  examDate?: string
  roiTag?: string
  createdAt?: string
  updatedAt?: string
  source: QuestionSource
}

export interface QuestionBundle {
  schemaVersion: number
  exportedAt: string | null
  subjects: Array<Record<string, unknown>>
  questions: Array<Record<string, unknown>>
}

interface QuestionLibraryContextValue {
  questions: QuestionLibraryItem[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const QuestionLibraryContext = createContext<QuestionLibraryContextValue | null>(null)
export const LOCAL_QUESTION_KEY = 'jee-pyq-hub:questions:v1'

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'general'
}

function stableId(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `legacy-${(hash >>> 0).toString(36)}`
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : value == null ? fallback : String(value)
}

function normalizedDifficulty(value: unknown): Difficulty {
  const text = asString(value, 'Moderate').trim().toLowerCase()
  if (text === 'easy' || text === 'basic') return 'Easy'
  if (text === 'tough' || text === 'hard' || text === 'difficult') return 'Difficult'
  return 'Moderate'
}

function normalizedQuestionType(value: unknown): Question['questionType'] {
  const text = asString(value, 'mcq').trim().toLowerCase()
  if (['numerical', 'integer', 'numerical value', 'integer type'].includes(text)) return 'numerical'
  if (text.includes('assertion') || text.includes('statement')) return 'assertion-reason'
  return 'mcq'
}

function optionId(value: unknown, index: number): 'A' | 'B' | 'C' | 'D' {
  const candidate = asString(value).trim().toUpperCase()
  if (candidate === 'A' || candidate === 'B' || candidate === 'C' || candidate === 'D') return candidate
  return (['A', 'B', 'C', 'D'][index] || 'A') as 'A' | 'B' | 'C' | 'D'
}

function toIso(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  if (value instanceof Date) return value.toISOString()
  return undefined
}

export function normalizeQuestionRecord(
  rawValue: unknown,
  source: QuestionSource = 'local',
  fallbackNumber = 1
): QuestionLibraryItem | null {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) return null
  const raw = rawValue as Record<string, unknown>
  const text = asString(raw.text ?? raw.questionText ?? raw.question ?? raw.statement).trim()
  if (!text) return null

  const subjectRaw = asString(raw.subjectSlug ?? raw.subjectName ?? raw.subject ?? raw.subjectId, 'Physics')
  const subjectSlug = slugify(subjectRaw)
  const subjectName = asString(raw.subjectName ?? raw.subject, subjectRaw)
  const chapterRaw = asString(raw.chapterSlug ?? raw.chapterName ?? raw.chapter ?? raw.chapterId, 'General')
  const chapterSlug = slugify(chapterRaw)
  const chapterName = asString(raw.chapterName ?? raw.chapter, chapterRaw)
  const examValue = raw.examType ?? raw.examCategory ?? raw.examName ?? raw.exam
  const examType = asString(examValue, 'JEE Main').trim() || 'JEE Main'
  const questionType = normalizedQuestionType(raw.questionType ?? raw.type)
  const rawOptions = Array.isArray(raw.options) ? raw.options : []
  const options = rawOptions.slice(0, 4).map((item, index) => {
    if (typeof item === 'string' || typeof item === 'number') {
      return { id: optionId(undefined, index), text: String(item) }
    }
    const option = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    return {
      id: optionId(option.id ?? option.key ?? option.label, index),
      text: asString(option.text ?? option.value ?? option.label),
      ...(asString(option.imageUrl ?? option.image).trim()
        ? { imageUrl: asString(option.imageUrl ?? option.image).trim() }
        : {}),
    }
  })
  const numberValue = Number(raw.number ?? raw.questionNumber ?? fallbackNumber)
  const id = asString(raw.id ?? raw.questionId).trim() || stableId(`${examType}|${raw.year ?? raw.examYear}|${subjectSlug}|${chapterSlug}|${raw.shift ?? raw.examShift}|${text}`)
  const rawCorrect = raw.correctOptionId ?? raw.correct ?? raw.answer
  const correctOption = asString(rawCorrect).trim().toUpperCase()
  const numericalAnswerValue = raw.correctAnswer ?? raw.numericalAnswer ?? (questionType === 'numerical' ? raw.answer : undefined)
  const numericalAnswer = numericalAnswerValue === '' || numericalAnswerValue == null
    ? undefined
    : Number(numericalAnswerValue)
  const roiTag = asString(raw.roiTag ?? raw.weightageTag ?? (raw.highWeightage ? 'High Weightage' : '')).trim()

  return {
    id,
    number: Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallbackNumber,
    chapterSlug,
    chapterName,
    subjectId: asString(raw.subjectId, subjectSlug),
    subjectSlug,
    subjectName,
    text,
    ...(asString(raw.imageUrl ?? raw.questionImageUrl).trim()
      ? { imageUrl: asString(raw.imageUrl ?? raw.questionImageUrl).trim() }
      : {}),
    questionType,
    options,
    ...(correctOption === 'A' || correctOption === 'B' || correctOption === 'C' || correctOption === 'D'
      ? { correctOptionId: correctOption }
      : {}),
    ...(typeof numericalAnswer === 'number' && Number.isFinite(numericalAnswer)
      ? { correctAnswer: numericalAnswer }
      : {}),
    ...(raw.answerTolerance !== undefined && Number.isFinite(Number(raw.answerTolerance))
      ? { answerTolerance: Number(raw.answerTolerance) }
      : {}),
    solution: asString(raw.solution ?? raw.explanation),
    ...(asString(raw.solutionImageUrl).trim() ? { solutionImageUrl: asString(raw.solutionImageUrl).trim() } : {}),
    difficulty: normalizedDifficulty(raw.difficulty),
    examType,
    year: Number(raw.year ?? raw.examYear) || new Date().getFullYear(),
    shift: asString(raw.shift ?? raw.examShift),
    topic: asString(raw.topic ?? raw.subtopic),
    examDate: asString(raw.examDate) || undefined,
    roiTag: roiTag || undefined,
    createdAt: toIso(raw.createdAt),
    updatedAt: toIso(raw.updatedAt),
    source,
  }
}

function looksLikeQuestion(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const raw = value as Record<string, unknown>
  const text = raw.text ?? raw.questionText ?? raw.question ?? raw.statement
  return typeof text === 'string' && text.trim().length > 0 && (
    typeof raw.solution === 'string' || typeof raw.explanation === 'string' ||
    Array.isArray(raw.options) || raw.correctAnswer !== undefined || raw.answer !== undefined
  )
}

export function collectQuestionRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap((item) => collectQuestionRecords(item))
  if (!value || typeof value !== 'object') return []
  if (looksLikeQuestion(value)) return [value]
  const object = value as Record<string, unknown>
  const found: Record<string, unknown>[] = []
  const visited = new Set<string>()
  for (const key of ['questions', 'items', 'data', 'records', 'pyqs']) {
    if (object[key] !== undefined) {
      visited.add(key)
      found.push(...collectQuestionRecords(object[key]))
    }
  }
  // Some older admin tools stored question rows under chapter ids or
  // arbitrary keys. Walk those values too, but only return strict question-shaped records.
  for (const [key, child] of Object.entries(object)) {
    if (!visited.has(key) && child && typeof child === 'object') found.push(...collectQuestionRecords(child))
  }
  return found
}

export function readLegacyQuestionRawRecords(): Record<string, unknown>[] {
  if (typeof window === 'undefined') return []
  const seen = new Set<string>()
  const found: Record<string, unknown>[] = []
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key) continue
      const value = window.localStorage.getItem(key)
      if (!value) continue
      try {
        const parsed = JSON.parse(value)
        for (const [index, raw] of collectQuestionRecords(parsed).entries()) {
          const identity = asString(raw.id ?? raw.questionId).trim() || stableId(`${raw.examType ?? raw.examCategory ?? 'JEE Main'}|${raw.year ?? raw.examYear}|${raw.subjectSlug ?? raw.subjectName ?? raw.subject}|${raw.chapterSlug ?? raw.chapter}|${raw.shift ?? raw.examShift}|${raw.text ?? raw.questionText ?? raw.question}`)
          if (seen.has(identity)) continue
          seen.add(identity)
          found.push({ ...raw, id: asString(raw.id ?? raw.questionId).trim() || identity })
        }
      } catch {
        // Ignore non-JSON legacy values; never remove or rewrite user storage.
      }
    }
  } catch {
    // Storage can be unavailable in a strict/private browser context.
  }
  return found
}

export function readLegacyQuestionRecords(): QuestionLibraryItem[] {
  return readLegacyQuestionRawRecords()
    .map((raw, index) => normalizeQuestionRecord(raw, 'local', index + 1))
    .filter((item): item is QuestionLibraryItem => Boolean(item))
}

async function readStaticBundle(): Promise<QuestionBundle> {
  try {
    const response = await fetch('/questions.json', { cache: 'no-store' })
    if (!response.ok) throw new Error('questions.json is not available')
    const value = await response.json()
    if (Array.isArray(value)) {
      return { schemaVersion: 1, exportedAt: null, subjects: [], questions: value }
    }
    return {
      schemaVersion: Number(value?.schemaVersion) || 1,
      exportedAt: typeof value?.exportedAt === 'string' ? value.exportedAt : null,
      subjects: Array.isArray(value?.subjects) ? value.subjects : [],
      questions: collectQuestionRecords(value?.questions ?? []),
    }
  } catch {
    return { schemaVersion: 1, exportedAt: null, subjects: [], questions: [] }
  }
}

function mapSamples(): QuestionLibraryItem[] {
  return sampleQuestions.map((question) => {
    const chapter = sampleChapters.find((item) => item.slug === question.chapterSlug)
    const subject = sampleSubjects.find((item) => item.slug === chapter?.subjectSlug)
    return {
      ...question,
      subjectId: subject?.slug || 'physics',
      subjectSlug: subject?.slug || 'physics',
      subjectName: subject?.name || 'Physics',
      chapterName: chapter?.name || question.chapterSlug,
      topic: (question as Question & { topic?: string }).topic || '',
      source: 'sample',
    }
  })
}

async function fetchFirestoreQuestions(exportedAt: string | null): Promise<QuestionLibraryItem[]> {
  if (!isConfigured) return []
  let remoteDocs: QueryDocumentSnapshot<DocumentData>[] = []
  try {
    const base = collectionGroup(db, 'questions')
    if (exportedAt && Number.isFinite(Date.parse(exportedAt))) {
      const exportedDate = Timestamp.fromDate(new Date(exportedAt))
      const [createdSnapshot, updatedSnapshot] = await Promise.all([
        getDocs(query(base, where('createdAt', '>', exportedDate))),
        getDocs(query(collectionGroup(db, 'questions'), where('updatedAt', '>', exportedDate))),
      ])
      const unique = new Map<string, (typeof createdSnapshot.docs)[number]>()
      ;[...createdSnapshot.docs, ...updatedSnapshot.docs].forEach((docSnap) => unique.set(docSnap.ref.path, docSnap))
      remoteDocs = Array.from(unique.values())
    } else {
      const snapshot = await getDocs(base)
      remoteDocs = snapshot.docs
    }
  } catch {
    // Older docs may lack timestamps or an index may not yet exist; retry as a full read.
    try {
      const snapshot = await getDocs(collectionGroup(db, 'questions'))
      remoteDocs = snapshot.docs
    } catch {
      return []
    }
  }
  if (!remoteDocs.length) return []

  const paths = remoteDocs.map((docSnap) => {
    const parts = docSnap.ref.path.split('/')
    return { docSnap, subjectId: parts[1] || '', chapterId: parts[3] || '' }
  })
  const subjectIds = Array.from(new Set(paths.map((entry) => entry.subjectId).filter(Boolean)))
  const subjectDocs = await Promise.all(subjectIds.map(async (id) => {
    try {
      const snap = await getDocs(collection(db, 'subjects', id, 'chapters'))
      return { id, chapters: snap.docs.map((chapter) => ({ id: chapter.id, ...(chapter.data() as Record<string, unknown>) })) }
    } catch {
      return { id, chapters: [] as Array<Record<string, unknown>> }
    }
  }))
  const chaptersByPath = new Map<string, Record<string, unknown>>()
  subjectDocs.forEach((subject) => subject.chapters.forEach((chapter) => chaptersByPath.set(`${subject.id}/${chapter.id}`, chapter)))

  const topSubjects = await getDocs(collection(db, 'subjects')).catch(() => null)
  const subjectsById = new Map<string, Record<string, unknown>>()
  topSubjects?.docs.forEach((subject) => subjectsById.set(subject.id, subject.data() as Record<string, unknown>))

  return paths.map(({ docSnap, subjectId, chapterId }, index) => {
    const question = docSnap.data() as Record<string, unknown>
    const subject = subjectsById.get(subjectId) || {}
    const chapter = chaptersByPath.get(`${subjectId}/${chapterId}`) || {}
    return normalizeQuestionRecord({
      ...question,
      id: docSnap.id,
      subjectId,
      subjectSlug: asString(subject.slug, subjectId),
      subjectName: asString(subject.name, subjectId),
      chapterId,
      chapterSlug: asString(chapter.slug, chapterId),
      chapterName: asString(chapter.name, chapterId),
    }, 'firestore', index + 1)!
  }).filter(Boolean)
}

function mergeQuestions(...sources: QuestionLibraryItem[][]): QuestionLibraryItem[] {
  const byId = new Map<string, QuestionLibraryItem>()
  const priority: Record<QuestionSource, number> = { sample: 0, static: 1, local: 2, firestore: 3 }
  sources.flat().forEach((item) => {
    const existing = byId.get(item.id)
    if (!existing || priority[item.source] >= priority[existing.source]) byId.set(item.id, item)
  })
  return Array.from(byId.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return a.subjectName.localeCompare(b.subjectName) || a.chapterName.localeCompare(b.chapterName) || a.number - b.number
  })
}

export async function loadQuestionLibrary(): Promise<QuestionLibraryItem[]> {
  const bundle = await readStaticBundle()
  const staticQuestions = collectQuestionRecords(bundle.questions)
    .map((raw, index) => normalizeQuestionRecord(raw, 'static', index + 1))
    .filter((item): item is QuestionLibraryItem => Boolean(item))
  const localQuestions = readLegacyQuestionRecords()
  const firestoreQuestions = await fetchFirestoreQuestions(bundle.exportedAt)

  if (staticQuestions.length === 0 && localQuestions.length === 0 && firestoreQuestions.length === 0) return mapSamples()
  return mergeQuestions(staticQuestions, localQuestions, firestoreQuestions)
}

export function QuestionLibraryProvider({ children }: { children: React.ReactNode }) {
  const [questions, setQuestions] = useState<QuestionLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setQuestions(await loadQuestionLibrary())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load questions.')
      setQuestions(mapSamples())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const value = useMemo(() => ({ questions, loading, error, refresh }), [questions, loading, error, refresh])
  return <QuestionLibraryContext.Provider value={value}>{children}</QuestionLibraryContext.Provider>
}

export function useQuestionLibrary() {
  const value = useContext(QuestionLibraryContext)
  if (!value) throw new Error('useQuestionLibrary must be used inside QuestionLibraryProvider.')
  return value
}

export function inferExamNames(questions: QuestionLibraryItem[]) {
  return Array.from(new Set(questions.map((question) => question.examType.trim()).filter(Boolean))).sort((a, b) => {
    if (a === 'JEE Main') return -1
    if (b === 'JEE Main') return 1
    return a.localeCompare(b)
  })
}
