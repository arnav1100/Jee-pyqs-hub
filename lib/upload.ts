'use client'

import { getDownloadURL, ref, uploadBytesResumable, type UploadTask } from 'firebase/storage'
import { isConfigured, storage } from './firebase'

/**
 * Uploads with real progress, a hard timeout and human-readable errors.
 *
 * The old `uploadBytes()` call had none of these: if the Storage bucket was
 * not enabled / rules blocked the write / the network stalled, the SDK kept
 * retrying in the background and the UI was stuck on “Uploading…” forever.
 */

export const MAX_RESOURCE_BYTES = 25 * 1024 * 1024 // 25 MB per resource file
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB for logos / QR / screenshots
export const DATA_URL_FALLBACK_BYTES = 1_500_000 // localStorage mode cap

export const RESOURCE_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp'
export const IMAGE_ACCEPT = 'image/*'

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function friendlyError(error: unknown): string {
  const code = (error as { code?: string })?.code || ''
  switch (code) {
    case 'storage/unauthorized':
      return 'Storage rules ne upload rok diya. Firebase → Storage → Rules me admin ke liye write allow karein.'
    case 'storage/canceled':
      return 'Upload cancel ho gaya.'
    case 'storage/quota-exceeded':
      return 'Firebase Storage ka quota bhar gaya hai — plan upgrade karein ya chhoti file daalein.'
    case 'storage/invalid-format':
      return 'Yeh file format Storage accept nahi kar raha. PDF/JPG/PNG try karein.'
    case 'storage/retry-limit-exceeded':
      return 'Network slow hai — upload 2 minute me poora nahi hua. Chhoti file ya fast connection se try karein.'
    case 'storage/unknown':
      return 'Storage ne error diya (bucket enable hai?). Firebase Console → Storage → Get started check karein.'
    default:
      return error instanceof Error ? error.message : 'Upload fail ho gaya — dobara try karein.'
  }
}

interface UploadOptions {
  /** 0–100, called on every progress tick. */
  onProgress?: (percent: number) => void
  /** Give up (and cancel) after this long. Default 2 minutes. */
  timeoutMs?: number
  /** Max allowed size in bytes. */
  maxBytes?: number
}

export async function uploadWithProgress(file: File, path: string, options: UploadOptions = {}): Promise<string> {
  const { onProgress, timeoutMs = 120_000, maxBytes = MAX_RESOURCE_BYTES } = options

  if (!file || file.size === 0) throw new Error('Yeh file khali hai — dobara select karein.')
  if (file.size > maxBytes) {
    throw new Error(`File bahut badi hai (${formatBytes(file.size)}). ${formatBytes(maxBytes)} tak allowed hai — chhoti file ya Drive link use karein.`)
  }
  if (!isConfigured) {
    throw new Error('Firebase Storage configured nahi hai. Vercel me Firebase env vars add karein, ya file ka direct link (Drive/Dropbox) paste kar dein.')
  }

  return new Promise<string>((resolve, reject) => {
    let task: UploadTask | null = null
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      try {
        task?.cancel()
      } catch {
        /* ignore */
      }
      reject(new Error('Upload 2 minute me poora nahi hua (network ya Storage issue). Dobara try karein ya file ka link paste karein.'))
    }, timeoutMs)

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn()
    }

    try {
      task = uploadBytesResumable(ref(storage, path), file, {
        contentType: file.type || undefined,
        cacheControl: 'public,max-age=31536000',
      })
    } catch (error) {
      finish(() => reject(new Error(friendlyError(error))))
      return
    }

    task.on(
      'state_changed',
      (snapshot) => {
        if (!onProgress) return
        const percent = snapshot.totalBytes > 0 ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0
        onProgress(Math.min(99, percent))
      },
      (error) => finish(() => reject(new Error(friendlyError(error)))),
      () => {
        onProgress?.(100)
        getDownloadURL(task!.snapshot.ref)
          .then((url) => finish(() => resolve(url)))
          .catch((error) => finish(() => reject(new Error(friendlyError(error)))))
      }
    )
  })
}

/** Reads a file as a data URL for the no-Firebase (localStorage) mode. */
export function readFileAsDataUrl(file: File, maxBytes = DATA_URL_FALLBACK_BYTES): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(
        new Error(
          `Firebase configured nahi hai, isliye file sirf ${formatBytes(maxBytes)} tak browser me save hoti hai (aapki file ${formatBytes(file.size)} hai). Firebase env vars add karein — ya file ka direct link paste karein.`
        )
      )
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('File padhi nahi ja saki — dobara try karein.'))
    reader.readAsDataURL(file)
  })
}

/** True when Firebase Storage keys exist (uploads go to the cloud). */
export const isFirebaseStorageConfigured = isConfigured
