#!/usr/bin/env node
/**
 * scripts/set-admin.js
 *
 * Grants (or revokes) the `admin: true` Firebase Auth custom claim for a
 * user, by email. This is the ONLY way to create an admin for JEE PYQ Hub
 * right now — there's no backend/Cloud Function yet, so this is a one-off
 * script you run locally with a service account key.
 *
 * Usage:
 *   node scripts/set-admin.js you@example.com
 *   node scripts/set-admin.js you@example.com --revoke
 *
 * Setup:
 *   1. npm install                (installs firebase-admin, see package.json)
 *   2. Firebase Console -> Project Settings -> Service Accounts
 *      -> "Generate new private key" -> save the JSON somewhere OUTSIDE
 *      the repo (never commit it).
 *   3. Point GOOGLE_APPLICATION_CREDENTIALS at that file, e.g.:
 *        export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccountKey.json
 *      (On Windows PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\key.json")
 *   4. Run the command above.
 *
 * After granting the claim, the user must sign out and back in before the
 * new claim shows up in their ID token — the admin login screen already
 * force-refreshes the token on each attempt (see lib/auth-context.tsx's
 * refreshAdmin), so simply signing in again at /admin is enough.
 */

const admin = require('firebase-admin')

async function main() {
  const args = process.argv.slice(2)
  const email = args.find((a) => !a.startsWith('--'))
  const revoke = args.includes('--revoke')

  if (!email) {
    console.error('Usage: node scripts/set-admin.js <email> [--revoke]')
    process.exit(1)
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      'GOOGLE_APPLICATION_CREDENTIALS is not set.\n' +
        'Download a service account key from Firebase Console -> Project Settings\n' +
        '-> Service Accounts -> Generate new private key, then run:\n\n' +
        '  export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccountKey.json\n'
    )
    process.exit(1)
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  })

  let user
  try {
    user = await admin.auth().getUserByEmail(email)
  } catch (err) {
    console.error(`No user found for email "${email}". They need to sign up in the app first.`)
    process.exit(1)
  }

  const existingClaims = user.customClaims || {}
  const nextClaims = { ...existingClaims, admin: !revoke }

  await admin.auth().setCustomUserClaims(user.uid, nextClaims)

  console.log(
    `✅ ${revoke ? 'Revoked' : 'Granted'} admin claim for ${email} (uid: ${user.uid}).\n` +
      'They need to sign out and sign back in — the admin login screen (AdminLoginModal)\n' +
      'force-refreshes the ID token on every login attempt, so a fresh sign-in is enough.'
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('Failed to set admin claim:', err)
  process.exit(1)
})
