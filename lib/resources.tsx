'use client'

import { useEffect, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, isConfigured } from './firebase'
import { useAuth } from './auth-context'

export type ResourceType = 'pdf' | 'notes' | 'link'
export type ResourceAccess = 'free' | 'paid'
export type RequestStatus = 'pending' | 'approved' | 'rejected'

export interface StudyResource {
  id: string
  title: string
  description: string
  subject: string
  type: ResourceType
  access: ResourceAccess
  price: number
  fileUrl: string
  fileName: string
  active: boolean
  createdAt: number
}

export interface ResourceRequest {
  id: string
  resourceId: string
  resourceTitle: string
  uid: string
  name: string
  email: string
  utr: string
  amount: number
  status: RequestStatus
  createdAt: number
  reviewedAt?: number
}

export const RESOURCE_STORAGE_KEY = 'jee-pyq-hub:resources:v1'
export const REQUEST_STORAGE_KEY = 'jee-pyq-hub:resource-requests:v1'
/** How long the student is asked to wait while a payment is verified. */
export const VERIFICATION_MINUTES = 5

function readLocal<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

const LOCAL_CHANGE_EVENT = 'jee-pyq-hub:resources-changed'

function notifyLocalChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT))
}

function subscribeLocalChange(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(LOCAL_CHANGE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(LOCAL_CHANGE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

function writeLocal<T>(key: string, rows: T[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(rows))
    notifyLocalChange()
  } catch {
    // Storage can be full or blocked; the UI still works for this session.
  }
}

function sortNewest<T extends { createdAt?: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

/* ------------------------------- Resources -------------------------------- */

export async function saveResource(input: Omit<StudyResource, 'id' | 'createdAt'> & { id?: string }) {
  const id = input.id || `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const record: StudyResource = {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    subject: input.subject.trim() || 'General',
    type: input.type,
    access: input.access,
    price: input.access === 'paid' ? Number(input.price) || 0 : 0,
    fileUrl: input.fileUrl.trim(),
    fileName: input.fileName.trim(),
    active: input.active,
    createdAt: Date.now(),
  }

  if (isConfigured) {
    const { id: _id, ...rest } = record
    await setDoc(doc(db, 'resources', id), { ...rest, updatedAt: new Date().toISOString() }, { merge: true })
    return record
  }

  const rows = readLocal<StudyResource>(RESOURCE_STORAGE_KEY).filter((row) => row.id !== id)
  writeLocal(RESOURCE_STORAGE_KEY, sortNewest([record, ...rows]))
  return record
}

export async function removeResource(id: string) {
  if (isConfigured) {
    await deleteDoc(doc(db, 'resources', id))
    return
  }
  writeLocal(RESOURCE_STORAGE_KEY, readLocal<StudyResource>(RESOURCE_STORAGE_KEY).filter((row) => row.id !== id))
}

export function useResources() {
  const [resources, setResources] = useState<StudyResource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured) {
      const load = () => {
        setResources(sortNewest(readLocal<StudyResource>(RESOURCE_STORAGE_KEY)))
        setLoading(false)
      }
      load()
      return subscribeLocalChange(load)
    }
    const unsubscribe = onSnapshot(
      collection(db, 'resources'),
      (snapshot) => {
        setResources(sortNewest(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<StudyResource, 'id'>) }))))
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsubscribe()
  }, [])

  return { resources, loading }
}

/* ------------------------------ Access requests ---------------------------- */

function localRequestsFor(uid: string) {
  return sortNewest(readLocal<ResourceRequest>(REQUEST_STORAGE_KEY).filter((row) => !row.uid || row.uid === uid || !isConfigured))
}

export function useMyResourceRequests() {
  const { user } = useAuth()
  const uid = user?.uid || 'local'
  const [requests, setRequests] = useState<ResourceRequest[]>([])

  useEffect(() => {
    if (!isConfigured || !user) {
      const load = () => setRequests(localRequestsFor(uid))
      load()
      return subscribeLocalChange(load)
    }
    const unsubscribe = onSnapshot(
      collection(db, 'resourceRequests'),
      (snapshot) => {
        const mine = snapshot.docs
          .map((item) => ({ id: item.id, ...(item.data() as Omit<ResourceRequest, 'id'>) }))
          .filter((row) => row.uid === user.uid)
        setRequests(sortNewest(mine))
      },
      () => setRequests([])
    )
    return () => unsubscribe()
  }, [uid, user])

  return requests
}

export function useAllResourceRequests() {
  const [requests, setRequests] = useState<ResourceRequest[]>([])

  useEffect(() => {
    if (!isConfigured) {
      const load = () => setRequests(sortNewest(readLocal<ResourceRequest>(REQUEST_STORAGE_KEY)))
      load()
      return subscribeLocalChange(load)
    }
    const unsubscribe = onSnapshot(
      collection(db, 'resourceRequests'),
      (snapshot) => setRequests(sortNewest(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ResourceRequest, 'id'>) })))),
      () => setRequests([])
    )
    return () => unsubscribe()
  }, [])

  return requests
}

export async function submitResourceRequest(input: {
  resourceId: string
  resourceTitle: string
  uid: string
  name: string
  email: string
  utr: string
  amount: number
}) {
  const id = `rq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const record: ResourceRequest = {
    id,
    resourceId: input.resourceId,
    resourceTitle: input.resourceTitle,
    uid: input.uid || 'local',
    name: input.name.trim(),
    email: input.email.trim(),
    utr: input.utr.trim().toUpperCase(),
    amount: Number(input.amount) || 0,
    status: 'pending',
    createdAt: Date.now(),
  }

  if (isConfigured && input.uid && input.uid !== 'local') {
    const { id: _id, ...rest } = record
    await setDoc(doc(db, 'resourceRequests', id), rest)
    return record
  }

  writeLocal(REQUEST_STORAGE_KEY, sortNewest([record, ...readLocal<ResourceRequest>(REQUEST_STORAGE_KEY)]))
  return record
}

export async function reviewResourceRequest(id: string, status: RequestStatus) {
  if (isConfigured) {
    await updateDoc(doc(db, 'resourceRequests', id), { status, reviewedAt: Date.now() })
    return
  }
  const rows = readLocal<ResourceRequest>(REQUEST_STORAGE_KEY).map((row) => (row.id === id ? { ...row, status, reviewedAt: Date.now() } : row))
  writeLocal(REQUEST_STORAGE_KEY, rows)
}

/** Resource ids the current visitor can open. */
export function useUnlockedResources() {
  const requests = useMyResourceRequests()
  const unlocked = new Set(requests.filter((row) => row.status === 'approved').map((row) => row.resourceId))
  return { requests, unlocked }
}

/** Reads a file as a data URL so paid/free files still work without Firebase. */
export function readFileAsDataUrl(file: File, maxBytes = 1_500_000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error(`File is too large (${Math.round(file.size / 1024)} KB). Keep it under ${Math.round(maxBytes / 1024)} KB, or paste a link instead.`))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

export function useVerificationCountdown(submittedAt: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const elapsed = Math.max(0, Math.floor((now - submittedAt) / 1000))
  const remaining = Math.max(0, VERIFICATION_MINUTES * 60 - elapsed)
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  return { remaining, label: `${minutes}:${String(seconds).padStart(2, '0')}`, done: remaining === 0 }
}
