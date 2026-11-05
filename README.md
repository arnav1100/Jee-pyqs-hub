# JEE PYQ HUB

A student-first JEE Main previous-year-question practice platform, built with Next.js App Router, Tailwind CSS, Firebase Authentication, Firestore and Storage. The public question library is designed to merge repository JSON, current Firestore questions and supported legacy browser question data without deleting or overwriting existing records.

## Student experience

- **Resources (`/resources`)** — free notes/PDFs, plus paid packs unlocked with a UPI payment + UTR verification (admin-managed in Admin → Resources).
- **Home (`/`)** — a simplified, friendly launch page with five main study choices and Physics, Chemistry and Mathematics entry points.
- **PYQ Library (`/pyqs`)** — chapter-wise question search with exam, year, subject and shift filters; additional filters remain available when needed.
- **Chapter test (`/tests`)** — build a short, focused test from one subject and chapter.
- **Mock test (`/mock-tests`)** — create a timed mixed-subject test from the loaded question bank.
- **Smart test (`/smart-test`)** — chapter-wise test that prioritizes previous mistakes, adds unseen questions, then fills from the same chapter if needed.
- **Mistake book (`/mistakes`)** — automatically captures incorrect answers, remembers the last wrong response and supports re-attempt and mastery status.
- **Practice (`/practice`)** — one-question-at-a-time learning mode, instant feedback, solutions, bookmarks, notes and keyboard shortcuts; linked from PYQ questions.
- **Performance (`/performance`)** — question accuracy by subject/chapter/difficulty, weekly activity, streak and daily goal, tracked time, completed test scores, recent answers and weak-chapter suggestions.
- **Dashboard (`/dashboard`)** — daily goal, streak, recent attempt, subject performance and unlocked milestones. It works locally without requiring a login.
- **Study resources (`/resources`)** — searchable formula reminders and chapter revision prompts.
- **Account sync** — browser-local practice works immediately. Firebase Auth and Firestore sync the study data across devices when configured.

## Admin

The admin route (`/admin`) is protected by the existing Firebase Auth `admin` custom claim. The existing Subjects, Chapters, Questions, Bulk Import, Users, Payments and Settings sections are retained, with two additions:

- **Exam Categories** — create exam categories with custom subjects and correct/incorrect/unattempted marking values. JEE Main remains the primary default. New categories appear dynamically in the library and test builder; question metadata remains a string for backward compatibility.
- **Global Sync** — download a merged `questions.json` export from Firestore, supported legacy browser question records and the existing static bundle. Replace `public/questions.json` with the downloaded file and push the commit to GitHub; Vercel then serves a shared static question copy on every device. JSON import is additive; duplicates are skipped and existing records are not edited or deleted.

The new loader reads `/questions.json`, merges it with supported local question records and uses Firestore for records newer than the export timestamp. Existing `jee-pyq-hub:progress:{chapterId}` keys are not renamed or cleared. A one-time migration reads compatible progress into the new analytics model while leaving original storage intact.

## Run locally

```bash
npm ci
cp .env.local.example .env.local
# Add your Firebase web configuration to .env.local when you want auth/cloud sync.
npm run dev
```

Open `http://localhost:3000`. Without Firebase configuration, the app remains usable with local study storage and explicitly labelled bundled sample content. The sample counts are computed from sample records rather than the old illustrative chapter totals.

## Firebase setup

1. Create a Firebase project, add a Web app, then copy the public web config variables from `.env.local.example` into `.env.local` (or Vercel environment settings).
2. Enable Google and Email/Password sign-in if you want account sync.
3. Create Firestore and deploy the rules in `firestore.rules`:
   ```bash
   firebase deploy --only firestore:rules
   ```
   You can also paste the file into Firebase Console → Firestore → Rules.
4. Enable Storage and deploy `storage.rules` for admin-managed images.
5. Grant the account used for admin work the existing custom claim `admin: true` using `scripts/set-admin.js`. Keep the Firebase service-account key outside the repository and never commit it.

The new Firestore rule paths are `/examCategories/{categoryId}`, `/users/{uid}/studyData/{docId}` and `/questionReports/{reportId}`. Deploy the updated rules before using cloud exam categories, cross-device study sync or signed-in question reports.

## Question model and backward compatibility

Existing nested Firestore records remain at:

```text
subjects/{subjectId}
  chapters/{chapterId}
    questions/{questionId}
```

The question reader accepts the existing fields (`text`, `options`, `correctOptionId`, `correctAnswer`, `solution`, `difficulty`, `examType`, `year`, `shift`, `topic`, images) plus optional exam date, updated date and ROI tag fields. Missing exam names default to `JEE Main`. Unknown exam names remain valid and become dynamic categories; legacy difficulty values continue to load and are displayed using student-friendly labels.

Static bundle format:

```json
{
  "schemaVersion": 1,
  "exportedAt": null,
  "subjects": [],
  "questions": []
}
```

The initial `public/questions.json` is intentionally empty: it does not claim to include Firebase records that are not present in the Git repository. Use Admin → Global Sync to create the actual exported bundle from the configured database.

## Existing account and admin features

The current Firebase Auth, user profile, plan/trial management, question CRUD, image uploads, manual payment review and site settings are retained. The premium/payment sections remain available from the existing project; the new PYQ library, practice workspace, mistake notebook, dashboard and mock-test routes are accessible independently of them.

## Verification before deployment

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

Deploy the updated Firestore rules before trying the new cloud-backed admin features. Never upload private keys, `.env.local`, admin credentials or user secrets to GitHub.
