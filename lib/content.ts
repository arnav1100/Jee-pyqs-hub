'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, isConfigured } from './firebase'
import {
  subjects as mockSubjects,
  chapters as mockChapters,
  questions as mockQuestions,
  type Subject,
  type Chapter,
  type Question,
} from '@/data/mockData'

export type ContentSource = 'firestore' | 'mock'

export interface SubjectDoc extends Subject {
  id: string
  source: ContentSource
}

export interface ChapterDoc extends Chapter {
  id: string
  subjectId: string
  source: ContentSource
}

export interface QuestionDoc extends Question {
  id: string
  subjectId: string
  topic?: string
  imageUrl?: string
  solutionImageUrl?: string
  source: ContentSource
}

function mockSubjectsAsDocs(): SubjectDoc[] {
  return mockSubjects.map((s) => ({ ...s, id: s.slug, source: 'mock' }))
}

function mockChaptersAsDocs(subjectSlug: string): ChapterDoc[] {
  return mockChapters
    .filter((c) => c.subjectSlug === subjectSlug)
    .map((c) => ({ ...c, id: c.slug, subjectId: subjectSlug, source: 'mock' }))
}

function mockQuestionsAsDocs(chapterSlug: string): QuestionDoc[] {
  return mockQuestions
    .filter((q) => q.chapterSlug === chapterSlug)
    .map((q) => ({ ...q, subjectId: '', source: 'mock' }))
}

/**
 * Subjects for the public site. If the Firestore `subjects` collection is
 * empty (fresh install, admin hasn't added anything yet) this falls back to
 * the bundled sample data in data/mockData.ts. As soon as an admin adds a
 * real subject, the site switches over to Firestore and stays there.
 */
export function useSubjects() {
  const [subjects, setSubjects] = useState<SubjectDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured) {
      setSubjects(mockSubjectsAsDocs())
      setLoading(false)
      return
    }
    const q = query(collection(db, 'subjects'), orderBy('createdAt', 'asc'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setSubjects(mockSubjectsAsDocs())
        } else {
          setSubjects(
            snap.docs.map((d) => ({ id: d.id, source: 'firestore', ...(d.data() as Subject) }))
          )
        }
        setLoading(false)
      },
      () => {
        setSubjects(mockSubjectsAsDocs())
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [])

  return { subjects, loading }
}

/**
 * Chapters for a given subject doc (as returned by useSubjects). Pass the
 * whole SubjectDoc so we know whether to read Firestore or mock data.
 */
export function useChapters(subject: SubjectDoc | undefined) {
  const [chapters, setChapters] = useState<ChapterDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!subject) {
      setChapters([])
      setLoading(true)
      return
    }
    if (subject.source === 'mock') {
      setChapters(mockChaptersAsDocs(subject.slug))
      setLoading(false)
      return
    }
    const q = query(collection(db, 'subjects', subject.id, 'chapters'), orderBy('createdAt', 'asc'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setChapters(
          snap.docs.map((d) => ({
            id: d.id,
            subjectId: subject.id,
            source: 'firestore',
            ...(d.data() as Chapter),
          }))
        )
        setLoading(false)
      },
      () => {
        setChapters([])
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [subject?.id, subject?.source, subject?.slug])

  return { chapters, loading }
}

/**
 * Questions for a given chapter doc (as returned by useChapters).
 */
export function useQuestions(subject: SubjectDoc | undefined, chapter: ChapterDoc | undefined) {
  const [questions, setQuestions] = useState<QuestionDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!subject || !chapter) {
      setQuestions([])
      setLoading(true)
      return
    }
    if (subject.source === 'mock' || chapter.source === 'mock') {
      setQuestions(mockQuestionsAsDocs(chapter.slug))
      setLoading(false)
      return
    }
    const q = query(
      collection(db, 'subjects', subject.id, 'chapters', chapter.id, 'questions'),
      orderBy('number', 'asc')
    )
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setQuestions(
          snap.docs.map((d) => ({
            subjectId: subject.id,
            source: 'firestore',
            ...(d.data() as Question),
            id: d.id,
          }))
        )
        setLoading(false)
      },
      () => {
        setQuestions([])
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [subject?.id, subject?.source, chapter?.id, chapter?.source])

  return { questions, loading }
}
