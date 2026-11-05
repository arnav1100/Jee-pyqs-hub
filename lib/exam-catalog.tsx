'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, isConfigured } from './firebase'

export interface MarkingScheme {
  correct: number
  incorrect: number
  unattempted: number
}

export interface ExamCategory {
  slug: string
  name: string
  subjects: string[]
  markingScheme: MarkingScheme
  createdAt?: string
}

interface ExamCatalogValue {
  categories: ExamCategory[]
  loading: boolean
  saveCategory: (category: ExamCategory) => Promise<void>
  refreshLocal: () => void
}

const ExamCatalogContext = createContext<ExamCatalogValue | null>(null)
export const LOCAL_EXAM_CATEGORIES_KEY = 'jee-pyq-hub:exam-categories:v1'

export const DEFAULT_EXAM_CATEGORY: ExamCategory = {
  slug: 'jee-main',
  name: 'JEE Main',
  subjects: ['Physics', 'Chemistry', 'Mathematics'],
  markingScheme: { correct: 4, incorrect: -1, unattempted: 0 },
}

function slugify(value: string) {
  return value.trim().toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function normalizeCategory(value: unknown, fallbackSlug = ''): ExamCategory | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  const slug = (typeof raw.slug === 'string' ? raw.slug : fallbackSlug || name).trim() || name
  if (!name || !slug) return null
  const rawSubjects = Array.isArray(raw.subjects) ? raw.subjects : DEFAULT_EXAM_CATEGORY.subjects
  const scheme = raw.markingScheme && typeof raw.markingScheme === 'object'
    ? raw.markingScheme as Record<string, unknown>
    : {}
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : undefined
  return {
    name,
    slug: slugify(slug),
    subjects: rawSubjects.map((subject) => String(subject).trim()).filter(Boolean),
    markingScheme: {
      correct: Number.isFinite(Number(scheme.correct)) ? Number(scheme.correct) : 4,
      incorrect: Number.isFinite(Number(scheme.incorrect)) ? Number(scheme.incorrect) : -1,
      unattempted: Number.isFinite(Number(scheme.unattempted)) ? Number(scheme.unattempted) : 0,
    },
    createdAt,
  }
}

function mergeCategories(...groups: ExamCategory[][]) {
  const map = new Map<string, ExamCategory>()
  groups.flat().forEach((category) => map.set(category.slug, { ...map.get(category.slug), ...category }))
  if (!map.has(DEFAULT_EXAM_CATEGORY.slug)) map.set(DEFAULT_EXAM_CATEGORY.slug, DEFAULT_EXAM_CATEGORY)
  return Array.from(map.values()).sort((a, b) => a.slug === 'jee-main' ? -1 : b.slug === 'jee-main' ? 1 : a.name.localeCompare(b.name))
}

function readLocalCategories(): ExamCategory[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_EXAM_CATEGORIES_KEY)
    if (!raw) return []
    const value = JSON.parse(raw)
    return Array.isArray(value)
      ? value.map((item) => normalizeCategory(item)).filter((item): item is ExamCategory => Boolean(item))
      : []
  } catch {
    return []
  }
}

function writeLocalCategories(categories: ExamCategory[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_EXAM_CATEGORIES_KEY, JSON.stringify(categories))
}

export function ExamCatalogProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<ExamCategory[]>([DEFAULT_EXAM_CATEGORY])
  const [loading, setLoading] = useState(true)

  const refreshLocal = useCallback(() => {
    setCategories((current) => mergeCategories(current, readLocalCategories()))
  }, [])

  useEffect(() => {
    let cancelled = false
    const local = readLocalCategories()
    setCategories((current) => mergeCategories(current, local))

    fetch('/exam-categories.json', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : [])
      .then((raw) => {
        if (cancelled || !Array.isArray(raw)) return
        const parsed = raw.map((item) => normalizeCategory(item)).filter((item): item is ExamCategory => Boolean(item))
        setCategories((current) => mergeCategories(current, parsed, readLocalCategories()))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled && !isConfigured) setLoading(false)
      })

    if (!isConfigured) {
      setLoading(false)
      return () => { cancelled = true }
    }

    const unsubscribe = onSnapshot(
      collection(db, 'examCategories'),
      (snapshot) => {
        if (cancelled) return
        const remote = snapshot.docs
          .map((item) => normalizeCategory({ ...item.data(), slug: item.id }, item.id))
          .filter((item): item is ExamCategory => Boolean(item))
        setCategories((current) => mergeCategories(current, remote, readLocalCategories()))
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const saveCategory = useCallback(async (category: ExamCategory) => {
    const normalized = normalizeCategory(category)
    if (!normalized) throw new Error('Exam name and slug are required.')
    if (isConfigured) {
      await setDoc(doc(db, 'examCategories', normalized.slug), {
        ...normalized,
        updatedAt: serverTimestamp(),
        ...(normalized.createdAt ? {} : { createdAt: serverTimestamp() }),
      }, { merge: true })
    } else {
      const next = mergeCategories(readLocalCategories(), [normalized]).filter((item) => item.slug !== 'jee-main' || item.name === 'JEE Main')
      writeLocalCategories(next)
    }
    setCategories((current) => mergeCategories(current, [normalized]))
  }, [])

  const value = useMemo(() => ({ categories, loading, saveCategory, refreshLocal }), [categories, loading, saveCategory, refreshLocal])
  return <ExamCatalogContext.Provider value={value}>{children}</ExamCatalogContext.Provider>
}

export function useExamCatalog() {
  const value = useContext(ExamCatalogContext)
  if (!value) throw new Error('useExamCatalog must be used inside ExamCatalogProvider.')
  return value
}

export function categoryForName(categories: ExamCategory[], name: string) {
  const normalized = name.trim().toLowerCase()
  return categories.find((category) => category.name.trim().toLowerCase() === normalized) || {
    ...DEFAULT_EXAM_CATEGORY,
    name: name || DEFAULT_EXAM_CATEGORY.name,
    slug: slugify(name || DEFAULT_EXAM_CATEGORY.name),
  }
}
