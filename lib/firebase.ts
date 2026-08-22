import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Values come from environment variables — see .env.local.example.
// Falls back to a harmless placeholder so the app still builds and the UI
// still renders before you've configured a real Firebase project — auth
// calls will just fail gracefully until real keys are added.
const isConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key-not-configured',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
}

// Avoid re-initializing during Next.js hot reloads
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export { isConfigured }
const googleProvider = new GoogleAuthProvider()

function assertConfigured() {
  if (!isConfigured) {
    throw new Error('Firebase is not configured yet — add your web config to .env.local (see .env.local.example).')
  }
}

export async function loginWithGoogle() {
  assertConfigured()
  return signInWithPopup(auth, googleProvider)
}

export async function signUpWithEmail(email: string, password: string) {
  assertConfigured()
  return createUserWithEmailAndPassword(auth, email, password)
}

export async function loginWithEmail(email: string, password: string) {
  assertConfigured()
  return signInWithEmailAndPassword(auth, email, password)
}

export async function logout() {
  return signOut(auth)
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

// Admin status is stored as a Firebase custom claim (`admin: true`), set from
// a trusted environment only — see scripts/set-admin.js. `forceRefresh`
// re-fetches the ID token so a freshly-granted claim is picked up without a
// full re-login.
export async function checkIsAdmin(user: User | null, forceRefresh = false): Promise<boolean> {
  if (!user) return false
  try {
    const result = await user.getIdTokenResult(forceRefresh)
    return result.claims.admin === true
  } catch {
    return false
  }
}

export type { User }
export default app
