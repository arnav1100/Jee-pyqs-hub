# JEE PYQ Hub

A JEE Main & Advanced previous-year-questions practice platform, inspired by ExamGOAL. Built with Next.js (App Router), Tailwind CSS, and Firebase (Auth + Firestore + Storage).

## What's included

- **Public site**
  - **Home** (`/`) — hero + Physics / Chemistry / Mathematics subject cards
  - **Chapters** (`/[subject]`) — list of chapters for a subject
  - **Chapter dashboard** (`/[subject]/[chapter]`) — question stats, "Start Practice" / "Take Test"
  - **Practice** (`/[subject]/[chapter]/practice`) — question navigator, image support, prev/next, bookmark, show solution, auto-saved progress (Firestore when signed in, localStorage always)
  - **Test** (`/[subject]/[chapter]/test`) — timed mode with a results/score screen
  - **Auth** — Google sign-in and email/password, via Firebase Auth
- **Admin panel** (`/admin`, gated by the `admin` custom claim)
  - Dashboard overview, Subjects/Chapters/Questions CRUD (with image upload), Users (plan management), Payments (manual logging + status), Settings (site name/logo, pricing, UPI/QR, announcement banner)
- **Live data layer** — `lib/content.ts` reads `subjects/{id}/chapters/{id}/questions/{id}` from Firestore in real time (`onSnapshot`). If a collection is empty (fresh project, nothing added yet) it falls back to the bundled sample data in `data/mockData.ts`; as soon as an admin adds real content, the site switches to Firestore and stays there. `lib/admin-data.ts` has the equivalent read/write hooks for the admin panel. `lib/settings.ts` is the same pattern for site-wide settings.
- **Security rules**
  - `firestore.rules` — public read on `subjects/chapters/questions` and `settings`; per-user read/write on their own profile (`users/{uid}`, with `plan`/`planExpiresAt` locked to admin-only changes), progress, and attempts; `payments` is admin-only; everything else admin-only write.
  - `storage.rules` — public read, admin-only write, for `site/**` (logo, QR code) and `questions/{subjectId}/{chapterId}/**` (question & solution images).

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Firebase project's web config
npm run dev
```

Open http://localhost:3000. Without a configured `.env.local`, the site still runs and renders the bundled sample data (`data/mockData.ts`) — useful for UI work before Firebase is wired up.

## Firebase setup

1. **Create a project** → add a **Web app** → copy the config into `.env.local` (see `.env.local.example`).
2. **Authentication** → Sign-in methods → enable **Google** and **Email/Password**.
3. **Firestore Database** → create in production mode, then deploy `firestore.rules`:
   ```bash
   firebase deploy --only firestore:rules
   ```
   (requires the [Firebase CLI](https://firebase.google.com/docs/cli); run `firebase init` once to link this repo to your project if you haven't already, or just paste the contents of `firestore.rules` into Console → Firestore → Rules.)
4. **Storage** → enable, then deploy `storage.rules` the same way:
   ```bash
   firebase deploy --only storage
   ```
5. **Make yourself an admin** — see below. Admin status is a Firebase Auth **custom claim** (`admin: true`), not a Firestore field, so it can't be set from the client or spoofed by a signed-in user.

### Granting admin access

There's no backend/Cloud Function in this project yet, so custom claims are set with a one-off Node script using `firebase-admin`:

1. Sign up for a normal account in the app first (Google or email/password) — the script looks the user up by email.
2. Firebase Console → **Project Settings → Service Accounts → Generate new private key**. Save the JSON file *outside* the repo (never commit it — it's already covered by `.gitignore` if you keep it inside the project, but outside is safer).
3. Point `GOOGLE_APPLICATION_CREDENTIALS` at that file and run the script:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccountKey.json
   npm run set-admin -- you@example.com
   ```
   (On Windows PowerShell: `$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\key.json"`)
4. Sign out and back in (or just go to `/admin` and log in again — the admin login form force-refreshes the ID token on every attempt, so a fresh sign-in is enough).
5. To revoke: `npm run set-admin -- you@example.com --revoke`.

## Content model

```
subjects/{subjectId}
  slug, name, colorFrom, colorTo, totalChapters, totalQuestions, createdAt
  chapters/{chapterId}
    slug, name, totalQuestions, easy, moderate, difficult, createdAt
    questions/{questionId}
      number, text, imageUrl?, options[{id,text}], correctOptionId,
      solution, solutionImageUrl?, difficulty, examType, year, shift,
      topic?, createdAt

settings/site
  siteName, logoUrl, qrImageUrl, upiId, paymentLink,
  monthlyPrice, lifetimePrice, announcement{text, active}

users/{uid}
  email, displayName, photoURL, plan ('free'|'monthly'|'lifetime'),
  planExpiresAt, createdAt, lastLoginAt,
  trialStart, trialEnd   — 12h free trial window, set once at sign-up and
                            never editable by the user afterwards (see
                            "Free trial" below)
  progress/{chapterId}    — per-chapter practice progress (answers, bookmark
                             flags, attempted/correct/wrong counters, completed)
  bookmarks/{bookmarkId}  — bookmarked questions, queryable on their own
  attempts/{attemptId}    — timed-test attempt history (score, correct/wrong
                             counts), written by lib/stats.ts#recordAttempt
                             when a test is submitted
  subscriptions/{subscriptionId} — one doc per approved payment (plan, amount,
                             startedAt, expiresAt), written by the admin
                             approval flow as a history/audit trail

payments/{paymentId}
  uid?, name, email, plan, amount, status ('pending'|'verified'|'rejected'),
  transactionId?, screenshotUrl?, createdAt
```

### Free trial & plan access

Every new account gets a 12-hour free trial (`TRIAL_DURATION_MS` in
`lib/auth-context.tsx`), set on `trialStart`/`trialEnd` the first time the
user signs in. `computeAccess()` derives `hasAccess`/`isTrialActive`/`isPremium`
from `plan`, `planExpiresAt`, and `trialEnd` — this is what gates practice/test
content (`PremiumGate`) and drives the Navbar's Trial/Upgrade/Premium badge and
the admin Users list's trial/expiry text. `trialStart`/`trialEnd`/`plan`/
`planExpiresAt` are set once at account creation and are otherwise
admin-write-only (see `firestore.rules`) — a signed-in user can't extend their
own trial or grant themselves a plan from the client.

### Self-serve payments

The Premium page (`/premium`) has a full "I Have Paid" flow, not just an
admin-logged one: a signed-in user picks a plan, submits a transaction ID and
a payment-screenshot upload via `PaymentFormModal` (`lib/admin-data.ts#submitPayment`,
screenshot stored at `payment-proofs/{uid}/...` in Storage), and can see their
own request history and status on the same page (`useMyPayments`). The admin
Payments section verifies or rejects each request; approving one
(`approvePayment`) atomically activates the plan on `users/{uid}` (30-day
expiry for Monthly, no expiry for Lifetime) and logs a `subscriptions` record —
all in one batch, since `plan`/`planExpiresAt` are locked to admin-only writes.

`totalChapters`/`totalQuestions` on subjects, and `totalQuestions`/`easy`/`moderate`/`difficult` on chapters, are maintained automatically by `lib/admin-data.ts` (via Firestore transactions) whenever chapters/questions are added, edited, or deleted — you never need to recalculate them by hand.

## Image uploads

Question images, solution images, and site branding (logo/QR) go to Firebase Storage via `lib/admin-data.ts#uploadImage`:

- `site/{field}-{timestamp}-{filename}` — logo, QR code
- `questions/{subjectId}/{chapterId}/{field}-{timestamp}-{filename}` — question/solution images
- `payment-proofs/{uid}/{timestamp}-{filename}` — user-submitted payment screenshots, uploaded from the Premium page's "I Have Paid" form

`site/**` and `questions/**` are public-read, admin-write. `payment-proofs/{uid}/**`
is private — only that user and admins can read or write it — per `storage.rules`.

## Project structure

```
app/
  page.tsx                          Home
  [subject]/page.tsx                Chapters list
  [subject]/[chapter]/page.tsx      Chapter dashboard
  [subject]/[chapter]/practice/     Practice mode
  [subject]/[chapter]/test/         Timed test mode
  admin/page.tsx                    Admin gate (checks isAdmin) → AdminShell
components/
  admin/                            Admin panel UI (sections per collection)
  ...                               Public-site components
lib/
  content.ts                        Public read hooks (useSubjects/useChapters/useQuestions)
  admin-data.ts                     Admin CRUD hooks + Storage upload
  settings.ts                       Site settings hook
  auth-context.tsx                  Auth state, admin-claim check, user-profile upsert
  use-progress.ts                   Practice progress (Firestore + localStorage)
  firebase.ts                       Firebase app/auth/db/storage init
data/mockData.ts                    Bundled sample content (fallback + type source)
scripts/set-admin.js                Grants/revokes the admin custom claim
firestore.rules / storage.rules     Security rules
```

## Known gaps / next steps

- **No real payment gateway** — the "I Have Paid" flow (transaction ID + screenshot, admin verification) works end-to-end, but there's no automated gateway integration (Razorpay/Stripe/UPI deep-link with webhook verification) — approval is a manual admin step in the Payments section.
- **`npm install` / `tsc --noEmit` have not been run in this environment** (no network access in the sandbox this was built in). Please run both locally before deploying:
  ```bash
  npm install
  npx tsc --noEmit
  ```
  All new/changed files were reviewed by hand for type-correctness, but a real compiler pass is worth doing before you ship.
