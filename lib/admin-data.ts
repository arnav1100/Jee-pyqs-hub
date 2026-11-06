'use client'

import { useEffect, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import { db, storage, isConfigured } from './firebase'
import { uploadWithProgress } from './upload'
import { collectQuestionRecords, normalizeQuestionRecord, readLegacyQuestionRawRecords } from './question-library'
import type { Difficulty, ExamType, Option, QuestionType } from '@/data/mockData'

const MONTHLY_PLAN_DAYS = 30

/* ---------------------------------- Types --------------------------------- */

export interface AdminSubject {
  id: string
  slug: string
  name: string
  colorFrom: string
  colorTo: string
  totalChapters: number
  totalQuestions: number
}

export interface AdminChapter {
  id: string
  subjectId: string
  slug: string
  name: string
  totalQuestions: number
  easy: number
  moderate: number
  difficult: number
}

export interface AdminQuestionInput {
  text: string
  imageUrl?: string
  questionType?: QuestionType
  options: Option[]
  correctOptionId?: Option['id']
  correctAnswer?: number
  answerTolerance?: number
  solution: string
  solutionImageUrl?: string
  difficulty: Difficulty
  examType: ExamType
  examDate?: string
  year: number
  shift: string
  topic: string
  roiTag?: string
}

export interface AdminQuestion extends AdminQuestionInput {
  id: string
  subjectId: string
  chapterId: string
  chapterSlug: string
  number: number
}

export interface AdminUser {
  id: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  plan: 'free' | 'monthly' | 'lifetime'
  planExpiresAt?: string | null
  trialStart?: string | null
  trialEnd?: string | null
}

export interface AdminPayment {
  id: string
  uid?: string
  name: string
  email: string
  /** Plan id chosen on /premium. Free-form so admins can invent new plans. */
  plan: string
  /** Human-readable plan name, shown in the admin queue and receipts. */
  planName?: string
  /** Plan length in days; 0 = lifetime. Drives the access granted on approval. */
  durationDays?: number
  amount: number
  status: 'pending' | 'verified' | 'rejected'
  note?: string
  transactionId?: string
  screenshotUrl?: string
}

const difficultyKey: Record<Difficulty, 'easy' | 'moderate' | 'difficult'> = {
  Easy: 'easy',
  Moderate: 'moderate',
  Difficult: 'difficult',
}

/* ------------------------------- Subjects --------------------------------- */

export function useAdminSubjects() {
  const [subjects, setSubjects] = useState<AdminSubject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'subjects'), orderBy('createdAt', 'asc'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setSubjects(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AdminSubject[])
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsubscribe()
  }, [])

  return { subjects, loading }
}

export async function addSubject(data: {
  slug: string
  name: string
  colorFrom: string
  colorTo: string
}) {
  const subjectRef = doc(collection(db, 'subjects'))
  await setDoc(subjectRef, {
    ...data,
    totalChapters: 0,
    totalQuestions: 0,
    createdAt: serverTimestamp(),
  })
  return subjectRef.id
}

export async function updateSubject(
  id: string,
  data: Partial<{ slug: string; name: string; colorFrom: string; colorTo: string }>
) {
  await updateDoc(doc(db, 'subjects', id), data)
}

/** Deletes a subject and cascades to all of its chapters and questions. */
export async function deleteSubject(id: string) {
  const chaptersSnap = await getDocs(collection(db, 'subjects', id, 'chapters'))
  for (const chapterDoc of chaptersSnap.docs) {
    await deleteChapterCascade(id, chapterDoc.id)
  }
  await deleteDoc(doc(db, 'subjects', id))
}

/* ------------------------------- Chapters ---------------------------------- */

export function useAdminChapters(subjectId: string | undefined) {
  const [chapters, setChapters] = useState<AdminChapter[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!subjectId) {
      setChapters([])
      setLoading(false)
      return
    }
    const q = query(collection(db, 'subjects', subjectId, 'chapters'), orderBy('createdAt', 'asc'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setChapters(
          snap.docs.map((d) => ({ id: d.id, subjectId, ...(d.data() as any) })) as AdminChapter[]
        )
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsubscribe()
  }, [subjectId])

  return { chapters, loading }
}

export async function addChapter(subjectId: string, data: { slug: string; name: string }) {
  const chapterRef = doc(collection(db, 'subjects', subjectId, 'chapters'))
  await setDoc(chapterRef, {
    ...data,
    totalQuestions: 0,
    easy: 0,
    moderate: 0,
    difficult: 0,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'subjects', subjectId), { totalChapters: increment(1) })
  return chapterRef.id
}

export async function updateChapter(
  subjectId: string,
  chapterId: string,
  data: Partial<{ slug: string; name: string }>
) {
  await updateDoc(doc(db, 'subjects', subjectId, 'chapters', chapterId), data)
}

async function deleteChapterCascade(subjectId: string, chapterId: string) {
  const questionsSnap = await getDocs(
    collection(db, 'subjects', subjectId, 'chapters', chapterId, 'questions')
  )
  const batch = writeBatch(db)
  questionsSnap.docs.forEach((qDoc) => batch.delete(qDoc.ref))
  batch.delete(doc(db, 'subjects', subjectId, 'chapters', chapterId))
  await batch.commit()
}

/** Deletes a chapter, its questions, and updates the parent subject's stats. */
export async function deleteChapter(subjectId: string, chapterId: string, chapterQuestionCount: number) {
  await deleteChapterCascade(subjectId, chapterId)
  await updateDoc(doc(db, 'subjects', subjectId), {
    totalChapters: increment(-1),
    totalQuestions: increment(-chapterQuestionCount),
  })
}

/* ------------------------------- Questions --------------------------------- */

export function useAdminQuestions(subjectId: string | undefined, chapterId: string | undefined) {
  const [questions, setQuestions] = useState<AdminQuestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!subjectId || !chapterId) {
      setQuestions([])
      setLoading(false)
      return
    }
    const q = query(
      collection(db, 'subjects', subjectId, 'chapters', chapterId, 'questions'),
      orderBy('number', 'asc')
    )
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setQuestions(
          snap.docs.map((d) => ({ id: d.id, subjectId, chapterId, ...(d.data() as any) })) as AdminQuestion[]
        )
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsubscribe()
  }, [subjectId, chapterId])

  return { questions, loading }
}

/**
 * Creates a question, auto-assigning the next question number for its
 * chapter and atomically updating the chapter's and subject's stats so
 * counts stay correct without a separate "recalculate" step.
 */
export async function addQuestion(
  subjectId: string,
  chapterId: string,
  chapterSlug: string,
  data: AdminQuestionInput
) {
  const chapterRef = doc(db, 'subjects', subjectId, 'chapters', chapterId)
  const subjectRef = doc(db, 'subjects', subjectId)
  const questionRef = doc(collection(db, 'subjects', subjectId, 'chapters', chapterId, 'questions'))
  const diffField = difficultyKey[data.difficulty]

  await runTransaction(db, async (tx) => {
    const chapterSnap = await tx.get(chapterRef)
    if (!chapterSnap.exists())
      throw new Error(
        'Chapter no longer exists (debug: subjectId="' + subjectId + '", chapterId="' + chapterId + '", path="' + chapterRef.path + '")'
      )
    const currentTotal = (chapterSnap.data().totalQuestions as number) || 0
    const number = currentTotal + 1

    tx.set(questionRef, {
      ...data,
      chapterSlug,
      number,
      createdAt: serverTimestamp(),
    })
    tx.update(chapterRef, {
      totalQuestions: increment(1),
      [diffField]: increment(1),
    })
    tx.update(subjectRef, { totalQuestions: increment(1) })
  })

  return questionRef.id
}

export async function updateQuestion(
  subjectId: string,
  chapterId: string,
  questionId: string,
  previousDifficulty: Difficulty,
  data: AdminQuestionInput
) {
  const questionRef = doc(db, 'subjects', subjectId, 'chapters', chapterId, 'questions', questionId)
  const chapterRef = doc(db, 'subjects', subjectId, 'chapters', chapterId)

  if (previousDifficulty !== data.difficulty) {
    await runTransaction(db, async (tx) => {
      tx.update(questionRef, { ...data, updatedAt: serverTimestamp() })
      tx.update(chapterRef, {
        [difficultyKey[previousDifficulty]]: increment(-1),
        [difficultyKey[data.difficulty]]: increment(1),
      })
    })
  } else {
    await updateDoc(questionRef, { ...data, updatedAt: serverTimestamp() })
  }
}

export async function deleteQuestion(
  subjectId: string,
  chapterId: string,
  questionId: string,
  difficulty: Difficulty
) {
  const questionRef = doc(db, 'subjects', subjectId, 'chapters', chapterId, 'questions', questionId)
  const chapterRef = doc(db, 'subjects', subjectId, 'chapters', chapterId)
  const subjectRef = doc(db, 'subjects', subjectId)

  await runTransaction(db, async (tx) => {
    tx.delete(questionRef)
    tx.update(chapterRef, {
      totalQuestions: increment(-1),
      [difficultyKey[difficulty]]: increment(-1),
    })
    tx.update(subjectRef, { totalQuestions: increment(-1) })
  })
}

/* -------------------------------- Storage ----------------------------------- */

/** Uploads a file to Firebase Storage under `path` and returns its download URL. */
/**
 * Uploads an image/file and returns its public URL.
 * Uses the resumable uploader with a hard timeout so a misconfigured Storage
 * bucket can never leave a form stuck on “Uploading…” forever.
 */
export async function uploadImage(
  file: File,
  path: string,
  options?: { onProgress?: (percent: number) => void; timeoutMs?: number; maxBytes?: number }
): Promise<string> {
  return uploadWithProgress(file, path, options)
}

export async function deleteImageByUrl(url: string) {
  try {
    await deleteObject(ref(storage, url))
  } catch {
    // Best-effort — ignore if already gone or URL isn't a storage ref.
  }
}

/* --------------------------------- Users ------------------------------------ */

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AdminUser[])
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsubscribe()
  }, [])

  return { users, loading }
}

export async function updateUserPlan(uid: string, plan: AdminUser['plan'], planExpiresAt: string | null) {
  await updateDoc(doc(db, 'users', uid), { plan, planExpiresAt })
}

/* -------------------------------- Payments ----------------------------------- */

export function useAdminPayments() {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setPayments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AdminPayment[])
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsubscribe()
  }, [])

  return { payments, loading }
}

export async function addPayment(data: Omit<AdminPayment, 'id' | 'status'>) {
  const paymentRef = doc(collection(db, 'payments'))
  await setDoc(paymentRef, { ...data, status: 'pending', createdAt: serverTimestamp() })
  return paymentRef.id
}

/**
 * Self-serve "I Have Paid" submission from the Premium page. Always tags
 * the request with the signed-in user's uid (required by firestore.rules
 * so a user can only submit — and later read — their own payment request).
 */
export async function submitPayment(
  uid: string,
  data: {
    name: string
    email: string
    plan: string
    planName?: string
    durationDays?: number
    amount: number
    transactionId: string
    screenshotUrl: string
  }
) {
  const paymentRef = doc(collection(db, 'payments'))
  await setDoc(paymentRef, { ...data, uid, status: 'pending', createdAt: serverTimestamp() })
  return paymentRef.id
}

export async function updatePaymentStatus(id: string, status: AdminPayment['status']) {
  await updateDoc(doc(db, 'payments', id), { status })
}

/**
 * Admin approval: marks the payment verified, activates the plan on the
 * user's account (30-day access for Monthly, unlimited for Lifetime), and
 * logs a `subscriptions` record. Everything is written admin-side since
 * `users/{uid}.plan`/`planExpiresAt` are locked to admin-only writes.
 */
export async function approvePayment(payment: AdminPayment) {
  if (!payment.uid) {
    // No matching account — just mark verified so it's out of the queue;
    // there's no user doc to grant access to.
    await updateDoc(doc(db, 'payments', payment.id), { status: 'verified' })
    return
  }

  const now = new Date()
  // Admins create plans with any duration (see components/admin/sections/
  // PlansManager.tsx). durationDays === 0 means lifetime. Older payment rows
  // that only carry plan: 'monthly' | 'lifetime' still work via the fallback.
  const days = typeof payment.durationDays === 'number'
    ? payment.durationDays
    : payment.plan === 'lifetime'
      ? 0
      : MONTHLY_PLAN_DAYS
  const planExpiresAt = days > 0 ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString() : null
  const grantedPlan: 'monthly' | 'lifetime' = days > 0 ? 'monthly' : 'lifetime'

  const paymentRef = doc(db, 'payments', payment.id)
  const userRef = doc(db, 'users', payment.uid)
  const subscriptionRef = doc(collection(db, 'users', payment.uid, 'subscriptions'))

  const batch = writeBatch(db)
  batch.update(paymentRef, { status: 'verified' })
  batch.update(userRef, { plan: grantedPlan, planExpiresAt })
  batch.set(subscriptionRef, {
    plan: grantedPlan,
    planId: payment.plan,
    planName: payment.planName ?? null,
    amount: payment.amount,
    paymentId: payment.id,
    startedAt: serverTimestamp(),
    expiresAt: planExpiresAt,
  })
  await batch.commit()
}

export async function rejectPayment(paymentId: string) {
  await updateDoc(doc(db, 'payments', paymentId), { status: 'rejected' })
}

/** Live payment history for the signed-in user (Premium page "your requests"). */
export function useMyPayments(uid: string | undefined) {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setPayments([])
      setLoading(false)
      return
    }
    const q = query(collection(db, 'payments'), where('uid', '==', uid))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AdminPayment[]
        rows.sort((a, b) => (a.id < b.id ? 1 : -1))
        setPayments(rows)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsubscribe()
  }, [uid])

  return { payments, loading }
}

/* --------------------------------- Stats ------------------------------------- */

/** Aggregate counts for the Dashboard overview tab. */
export function useAdminOverview() {
  const { subjects } = useAdminSubjects()
  const { users } = useAdminUsers()
  const { payments } = useAdminPayments()

  const totalQuestions = subjects.reduce((sum, s) => sum + (s.totalQuestions || 0), 0)
  const totalChapters = subjects.reduce((sum, s) => sum + (s.totalChapters || 0), 0)
  const pendingPayments = payments.filter((p) => p.status === 'pending').length
  const paidUsers = users.filter((u) => u.plan !== 'free').length

  return {
    totalSubjects: subjects.length,
    totalChapters,
    totalQuestions,
    totalUsers: users.length,
    paidUsers,
    totalPayments: payments.length,
    pendingPayments,
  }
}
/* ------------------------------ Bulk Import ---------------------------------- */



export interface BulkQuestionRow {
  subjectName: string
  chapterName: string
  text: string
  questionType?: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionAImageUrl?: string
  optionBImageUrl?: string
  optionCImageUrl?: string
  optionDImageUrl?: string
  questionImageUrl?: string
  correct: 'A' | 'B' | 'C' | 'D'
  numericalAnswer?: string
  numericalTolerance?: string
  solution: string
  difficulty: Difficulty
  examType: ExamType
  examDate?: string
  year: number
  shift: string
  topic: string
  roiTag?: string
}



export interface BulkImportError {
  row: number
  message: string
}

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizeQuestionText(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function bulkImportQuestions(
  rows: BulkQuestionRow[],
  subjects: AdminSubject[],
  onProgress?: (done: number, total: number) => void
): Promise<{ imported: number; duplicates: number; errors: BulkImportError[] }> {
  const errors: BulkImportError[] = []
  const validRows: (BulkQuestionRow & { rowIndex: number; resolvedType: QuestionType })[] = []

  rows.forEach((r, i) => {
    const rowIndex = i + 2
    const typeRaw = (r.questionType || 'mcq').trim().toLowerCase()
    const resolvedType: QuestionType = typeRaw.includes('numerical') || typeRaw.includes('integer')
      ? 'numerical'
      : typeRaw.includes('assertion') || typeRaw.includes('statement')
        ? 'assertion-reason'
        : 'mcq'

    if (!r.subjectName?.trim() || !r.chapterName?.trim() || !r.text?.trim() || !r.solution?.trim()) {
      errors.push({ row: rowIndex, message: 'Missing a required field (subject/chapter/question/solution)' })
      return
    }
    if (!['Easy', 'Moderate', 'Difficult'].includes(r.difficulty)) {
      errors.push({ row: rowIndex, message: 'Difficulty must be Easy, Moderate or Difficult (got "' + r.difficulty + '")' })
      return
    }
    // Older imports without an exam value stay backward-compatible with the primary category.
    if (!r.examType?.trim()) r.examType = 'JEE Main'

    if (resolvedType === 'numerical') {
      const num = Number(r.numericalAnswer)
      if (r.numericalAnswer === undefined || r.numericalAnswer.trim() === '' || Number.isNaN(num)) {
        errors.push({ row: rowIndex, message: 'Numerical Answer must be a number for a Numerical question' })
        return
      }
      validRows.push({ ...r, correct: 'A', rowIndex, resolvedType })
      return
    }

    if (
      (!r.optionA?.trim() && !r.optionAImageUrl?.trim()) ||
      (!r.optionB?.trim() && !r.optionBImageUrl?.trim()) ||
      (!r.optionC?.trim() && !r.optionCImageUrl?.trim()) ||
      (!r.optionD?.trim() && !r.optionDImageUrl?.trim()) ||
      !r.correct?.trim()
    ) {
      errors.push({ row: rowIndex, message: 'Missing a required field (options (text or image)/correct)' })
      return
    }
    if (!['A', 'B', 'C', 'D'].includes(r.correct.trim().toUpperCase())) {
      errors.push({ row: rowIndex, message: 'Correct answer must be A, B, C or D (got "' + r.correct + '")' })
      return
    }
    validRows.push({ ...r, correct: r.correct.trim().toUpperCase() as 'A' | 'B' | 'C' | 'D', rowIndex, resolvedType })
  })

  const groups = new Map<string, (BulkQuestionRow & { rowIndex: number; resolvedType: QuestionType })[]>()
  for (const row of validRows) {
    const key = row.subjectName.trim().toLowerCase() + '|||' + row.chapterName.trim().toLowerCase()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  let imported = 0
  let duplicates = 0
  const total = validRows.length

  for (const groupRows of groups.values()) {
    const subjectName = groupRows[0].subjectName.trim()
    const chapterName = groupRows[0].chapterName.trim()
    const subject = subjects.find((s) => s.name.trim().toLowerCase() === subjectName.toLowerCase())

    if (!subject) {
      groupRows.forEach((r) => errors.push({ row: r.rowIndex, message: 'Subject "' + subjectName + '" not found in the app' }))
      continue
    }

    const chaptersSnap = await getDocs(collection(db, 'subjects', subject.id, 'chapters'))
    const existingChapterDoc = chaptersSnap.docs.find(
      (d) => ((d.data().name as string) || '').trim().toLowerCase() === chapterName.toLowerCase()
    )

    let chapterId: string
    let chapterSlug: string
    let currentTotal: number

    if (existingChapterDoc) {
      chapterId = existingChapterDoc.id
      const data = existingChapterDoc.data()
      chapterSlug = data.slug || slugify(chapterName)
      currentTotal = (data.totalQuestions as number) || 0
    } else {
      chapterSlug = slugify(chapterName)
      chapterId = await addChapter(subject.id, { slug: chapterSlug, name: chapterName })
      currentTotal = 0
    }

    const chapterRef = doc(db, 'subjects', subject.id, 'chapters', chapterId)
    const subjectRef = doc(db, 'subjects', subject.id)

    const existingQuestionsSnap = await getDocs(
      collection(db, 'subjects', subject.id, 'chapters', chapterId, 'questions')
    )
    const questionSignature = (text: string, examType: string, year: number, shift: string) =>
      [normalizeQuestionText(text), examType.trim().toLowerCase(), year, shift.trim().toLowerCase()].join('|||')
    const seenQuestions = new Set<string>()
    existingQuestionsSnap.docs.forEach((d) => {
      const data = d.data()
      const text = (data.text as string) || ''
      if (text) seenQuestions.add(questionSignature(text, String(data.examType || 'JEE Main'), Number(data.year) || 0, String(data.shift || '')))
    })

    const rowsToWrite: typeof groupRows = []
    for (const row of groupRows) {
      const signature = questionSignature(row.text, row.examType || 'JEE Main', row.year, row.shift || '')
      if (seenQuestions.has(signature)) {
        duplicates += 1
        continue
      }
      seenQuestions.add(signature)
      rowsToWrite.push(row)
    }

    let newEasy = 0
    let newModerate = 0
    let newDifficult = 0
    const CHUNK = 400

    for (let i = 0; i < rowsToWrite.length; i += CHUNK) {
      const chunk = rowsToWrite.slice(i, i + CHUNK)
      const batch = writeBatch(db)
      chunk.forEach((row, idx) => {
        const qRef = doc(collection(db, 'subjects', subject.id, 'chapters', chapterId, 'questions'))
        const isNumerical = row.resolvedType === 'numerical'

        const options: Option[] = isNumerical
          ? []
          : [
              { id: 'A', text: row.optionA, ...(row.optionAImageUrl?.trim() ? { imageUrl: row.optionAImageUrl.trim() } : {}) },
              { id: 'B', text: row.optionB, ...(row.optionBImageUrl?.trim() ? { imageUrl: row.optionBImageUrl.trim() } : {}) },
              { id: 'C', text: row.optionC, ...(row.optionCImageUrl?.trim() ? { imageUrl: row.optionCImageUrl.trim() } : {}) },
              { id: 'D', text: row.optionD, ...(row.optionDImageUrl?.trim() ? { imageUrl: row.optionDImageUrl.trim() } : {}) },
            ]

        batch.set(qRef, {
          text: row.text,
          questionType: row.resolvedType,
          options,
          ...(row.questionImageUrl?.trim() ? { imageUrl: row.questionImageUrl.trim() } : {}),
          ...(isNumerical
            ? {
                correctAnswer: Number(row.numericalAnswer),
                ...(row.numericalTolerance?.trim() ? { answerTolerance: Number(row.numericalTolerance) } : {}),
              }
            : { correctOptionId: row.correct }),
          solution: row.solution,
          difficulty: row.difficulty,
          examType: row.examType || 'JEE Main',
          ...(row.examDate?.trim() ? { examDate: row.examDate.trim() } : {}),
          year: row.year,
          shift: row.shift || '',
          topic: row.topic || '',
          ...(row.roiTag?.trim() ? { roiTag: row.roiTag.trim() } : {}),
          chapterSlug,
          number: currentTotal + i + idx + 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        if (row.difficulty === 'Easy') newEasy++
        else if (row.difficulty === 'Moderate') newModerate++
        else newDifficult++
      })
      await batch.commit()
      imported += chunk.length
      onProgress?.(imported + duplicates, total)
    }

    if (rowsToWrite.length > 0) {
      await updateDoc(chapterRef, {
        totalQuestions: increment(rowsToWrite.length),
        easy: increment(newEasy),
        moderate: increment(newModerate),
        difficult: increment(newDifficult),
      })
      await updateDoc(subjectRef, { totalQuestions: increment(rowsToWrite.length) })
    }
  }

  return { imported, duplicates, errors }
}
/* ------------------------- Global question sync ---------------------------- */

function makeJsonSafe(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  if (Array.isArray(value)) return value.map(makeJsonSafe)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, makeJsonSafe(entry)]))
  }
  return value
}

/**
 * Creates a non-destructive, merge-only export for /public/questions.json.
 * Live Firestore records win over static/local copies with the same id;
 * no database records are edited or deleted by this operation.
 */
export async function exportQuestionDatabase() {
  const exportedAt = new Date().toISOString()
  let subjects: Record<string, unknown>[] = []
  const firestoreRows: Record<string, unknown>[] = []

  if (isConfigured) {
    const subjectSnapshot = await getDocs(collection(db, 'subjects'))
    const subjectDocs = subjectSnapshot.docs
    subjects = subjectDocs.map((subjectDoc) => ({ id: subjectDoc.id, ...makeJsonSafe(subjectDoc.data()) as Record<string, unknown> }))

    const chapterGroups = await Promise.all(subjectDocs.map(async (subjectDoc) => {
      const chapterSnapshot = await getDocs(collection(db, 'subjects', subjectDoc.id, 'chapters'))
      return { subjectDoc, chapters: chapterSnapshot.docs }
    }))
    const questionGroups = await Promise.all(chapterGroups.flatMap(({ subjectDoc, chapters }) => chapters.map(async (chapterDoc) => {
      const snapshot = await getDocs(collection(db, 'subjects', subjectDoc.id, 'chapters', chapterDoc.id, 'questions'))
      const subjectData = subjectDoc.data()
      const chapterData = chapterDoc.data()
      return snapshot.docs.map((questionDoc) => ({
        ...makeJsonSafe(questionDoc.data()) as Record<string, unknown>,
        id: questionDoc.id,
        subjectId: subjectDoc.id,
        subjectSlug: String(subjectData.slug || subjectDoc.id),
        subjectName: String(subjectData.name || subjectDoc.id),
        chapterId: chapterDoc.id,
        chapterSlug: String(chapterData.slug || chapterDoc.id),
        chapterName: String(chapterData.name || chapterDoc.id),
        examType: String(questionDoc.data().examType || 'JEE Main'),
      }))
    })))
    questionGroups.forEach((rows) => firestoreRows.push(...rows))
  }

  let staticRows: Record<string, unknown>[] = []
  let staticSubjects: Record<string, unknown>[] = []
  try {
    const response = await fetch('/questions.json', { cache: 'no-store' })
    if (response.ok) {
      const payload = await response.json()
      staticRows = collectQuestionRecords(payload)
      if (Array.isArray(payload?.subjects)) staticSubjects = payload.subjects
    }
  } catch {
    // A missing static bundle is a valid first-run state.
  }
  const localRows = readLegacyQuestionRawRecords()

  const mergedQuestions = new Map<string, { priority: number; row: Record<string, unknown> }>()
  const addRows = (rows: Record<string, unknown>[], priority: number, source: 'static' | 'local' | 'firestore') => {
    rows.forEach((raw, index) => {
      const normalized = normalizeQuestionRecord(raw, source, index + 1)
      if (!normalized) return
      const currentPriority = mergedQuestions.get(normalized.id)?.priority ?? -1
      if (currentPriority >= priority) return
      const { source: _source, ...normalizedFields } = normalized
      // Keep every unknown legacy field, while filling in identifiers and
      // the common metadata required by the new library.
      mergedQuestions.set(normalized.id, {
        priority,
        row: {
          ...normalizedFields,
          ...raw,
          id: normalized.id,
          subjectId: raw.subjectId || normalized.subjectId,
          subjectSlug: raw.subjectSlug || normalized.subjectSlug,
          subjectName: raw.subjectName || normalized.subjectName,
          chapterSlug: raw.chapterSlug || normalized.chapterSlug,
          chapterName: raw.chapterName || normalized.chapterName,
          examType: raw.examType || normalized.examType || 'JEE Main',
        },
      })
    })
  }
  addRows(staticRows, 1, 'static')
  addRows(localRows, 2, 'local')
  addRows(firestoreRows, 3, 'firestore')

  const mergedSubjects = new Map<string, Record<string, unknown>>()
  ;[...staticSubjects, ...subjects].forEach((subject, index) => {
    const id = String(subject.id || subject.slug || subject.name || `subject-${index}`)
    mergedSubjects.set(id, { ...mergedSubjects.get(id), ...subject })
  })

  return {
    schemaVersion: 1,
    exportedAt,
    subjects: Array.from(mergedSubjects.values()),
    questions: Array.from(mergedQuestions.values()).map((item) => item.row),
  }
}

/** Import a JSON question export as additive records; duplicates are skipped. */
export async function importQuestionDatabase(
  payload: unknown,
  subjects: AdminSubject[],
  onProgress?: (done: number, total: number) => void
) {
  const rows = collectQuestionRecords(payload).map((raw, index) => {
    const question = normalizeQuestionRecord(raw, 'local', index + 1)
    if (!question) return null
    const options = question.options || []
    return {
      subjectName: question.subjectName,
      chapterName: question.chapterName,
      text: question.text,
      questionType: question.questionType || 'mcq',
      optionA: options.find((option) => option.id === 'A')?.text || '',
      optionB: options.find((option) => option.id === 'B')?.text || '',
      optionC: options.find((option) => option.id === 'C')?.text || '',
      optionD: options.find((option) => option.id === 'D')?.text || '',
      optionAImageUrl: options.find((option) => option.id === 'A')?.imageUrl || '',
      optionBImageUrl: options.find((option) => option.id === 'B')?.imageUrl || '',
      optionCImageUrl: options.find((option) => option.id === 'C')?.imageUrl || '',
      optionDImageUrl: options.find((option) => option.id === 'D')?.imageUrl || '',
      questionImageUrl: question.imageUrl || '',
      correct: question.correctOptionId || 'A',
      numericalAnswer: question.correctAnswer === undefined ? '' : String(question.correctAnswer),
      numericalTolerance: question.answerTolerance === undefined ? '' : String(question.answerTolerance),
      solution: question.solution,
      difficulty: question.difficulty,
      examType: question.examType || 'JEE Main',
      examDate: question.examDate || '',
      year: question.year,
      shift: question.shift,
      topic: question.topic || '',
      roiTag: question.roiTag || '',
    } as BulkQuestionRow
  }).filter((row): row is BulkQuestionRow => Boolean(row))

  return bulkImportQuestions(rows, subjects, onProgress)
}
