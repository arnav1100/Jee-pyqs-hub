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
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from './firebase'
import type { Difficulty, ExamType, Option } from '@/data/mockData'

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
  options: Option[]
  correctOptionId: Option['id']
  solution: string
  solutionImageUrl?: string
  difficulty: Difficulty
  examType: ExamType
  year: number
  shift: string
  topic: string
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
  plan: 'monthly' | 'lifetime'
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
      tx.update(questionRef, { ...data })
      tx.update(chapterRef, {
        [difficultyKey[previousDifficulty]]: increment(-1),
        [difficultyKey[data.difficulty]]: increment(1),
      })
    })
  } else {
    await updateDoc(questionRef, { ...data })
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
export async function uploadImage(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
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
    plan: 'monthly' | 'lifetime'
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
  const planExpiresAt =
    payment.plan === 'monthly'
      ? new Date(now.getTime() + MONTHLY_PLAN_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null // lifetime = unlimited, no expiry

  const paymentRef = doc(db, 'payments', payment.id)
  const userRef = doc(db, 'users', payment.uid)
  const subscriptionRef = doc(collection(db, 'users', payment.uid, 'subscriptions'))

  const batch = writeBatch(db)
  batch.update(paymentRef, { status: 'verified' })
  batch.update(userRef, { plan: payment.plan, planExpiresAt })
  batch.set(subscriptionRef, {
    plan: payment.plan,
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

optionA: string

optionB: string

optionC: string

optionD: string

correct: 'A' | 'B' | 'C' | 'D'

solution: string

difficulty: Difficulty

examType: ExamType

year: number

shift: string

topic: string

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



/**

* Imports many questions at once from parsed spreadsheet rows.

* Groups rows by subject+chapter, creates any chapter that doesn't already

* exist (matched by name, case-insensitive), and writes questions in

* batches of 400 to stay under Firestore's 500-operation batch limit.

* Chapter/subject question counters are updated once per chapter at the

* end, rather than per question, to keep this fast for large imports.

*/

export async function bulkImportQuestions(

rows: BulkQuestionRow[],

subjects: AdminSubject[],

onProgress?: (done: number, total: number) => void

): Promise<{ imported: number; errors: BulkImportError[] }> {

const errors: BulkImportError[] = []

const validRows: (BulkQuestionRow & { rowIndex: number })[] = []



rows.forEach((r, i) => {

const rowIndex = i + 2 // +1 for header row, +1 for 1-indexing

if (

!r.subjectName?.trim() ||

!r.chapterName?.trim() ||

!r.text?.trim() ||

!r.optionA?.trim() ||

!r.optionB?.trim() ||

!r.optionC?.trim() ||

!r.optionD?.trim() ||

!r.correct?.trim() ||

!r.solution?.trim()

) {

errors.push({ row: rowIndex, message: 'Missing a required field (subject/chapter/question/options/correct/solution)' })

return

}

if (!['A', 'B', 'C', 'D'].includes(r.correct.trim().toUpperCase())) {

errors.push({ row: rowIndex, message: `Correct answer must be A, B, C or D (got "${r.correct}")` })

return

}

if (!['Easy', 'Moderate', 'Difficult'].includes(r.difficulty)) {

errors.push({ row: rowIndex, message: `Difficulty must be Easy, Moderate or Difficult (got "${r.difficulty}")` })

return

}

if (!['JEE Main', 'JEE Advanced'].includes(r.examType)) {

errors.push({ row: rowIndex, message: `Exam must be "JEE Main" or "JEE Advanced" (got "${r.examType}")` })

return

}

validRows.push({ ...r, correct: r.correct.trim().toUpperCase() as 'A' | 'B' | 'C' | 'D', rowIndex })

})



const groups = new Map<string, (BulkQuestionRow & { rowIndex: number })[]>()

for (const row of validRows) {

const key = `${row.subjectName.trim().toLowerCase()}|||${row.chapterName.trim().toLowerCase()}`

if (!groups.has(key)) groups.set(key, [])

groups.get(key)!.push(row)

}



let imported = 0

const total = validRows.length



for (const groupRows of groups.values()) {

const subjectName = groupRows[0].subjectName.trim()

const chapterName = groupRows[0].chapterName.trim()

const subject = subjects.find((s) => s.name.trim().toLowerCase() === subjectName.toLowerCase())



if (!subject) {

groupRows.forEach((r) => errors.push({ row: r.rowIndex, message: `Subject "${subjectName}" not found in the app` }))

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



let newEasy = 0

let newModerate = 0

let newDifficult = 0

const CHUNK = 400



for (let i = 0; i < groupRows.length; i += CHUNK) {

const chunk = groupRows.slice(i, i + CHUNK)

const batch = writeBatch(db)

chunk.forEach((row, idx) => {

const qRef = doc(collection(db, 'subjects', subject.id, 'chapters', chapterId, 'questions'))

const options: Option[] = [

{ id: 'A', text: row.optionA },

{ id: 'B', text: row.optionB },

{ id: 'C', text: row.optionC },

{ id: 'D', text: row.optionD },

]

batch.set(qRef, {

text: row.text,

options,

correctOptionId: row.correct,

solution: row.solution,

difficulty: row.difficulty,

examType: row.examType,

year: row.year,

shift: row.shift || '',

topic: row.topic || '',

chapterSlug,

number: currentTotal + i + idx + 1,

createdAt: serverTimestamp(),

})

if (row.difficulty === 'Easy') newEasy++

else if (row.difficulty === 'Moderate') newModerate++

else newDifficult++

})

await batch.commit()

imported += chunk.length

onProgress?.(imported, total)

}



await updateDoc(chapterRef, {

totalQuestions: increment(groupRows.length),

easy: increment(newEasy),

moderate: increment(newModerate),

difficult: increment(newDifficult),

})

await updateDoc(subjectRef, { totalQuestions: increment(groupRows.length) })

}



return { imported, errors }

} 

