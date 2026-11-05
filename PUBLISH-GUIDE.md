# Questions ko public karna + apna data safe rakhna

Ye guide 3 phases me hai. Sabse important baat pehle:

- **Aapke questions abhi aapke browser ke localStorage me hain** (live site ke origin par). Deploy karne se wo delete nahi hote, kyunki site ka domain wahi rehta hai.
- **localStorage kabhi public nahi hota.** Doosre log aapke browser ka data nahi dekh sakte. Public ko questions dikhane ke liye questions ko ya `public/questions.json` file me jaana hoga, ya Firebase (Firestore) me.
- Aapke students ke answers / mistakes / bookmarks har student ke apne browser me hi rahenge (private, by design).

---

## Phase 1 — Updated website live karo (data safe rehta hai)

1. `jee-pyqs-hub-updated.zip` download karein (Arena workspace se).
2. Zip ko unzip karke GitHub repo `arnav1100/Jee-pyqs-hub` ki `main` branch me replace karein (`node_modules`, `.next` mat daalein).
3. Commit + push → Vercel automatically deploy karega usi domain par: `jee-pyqs-hub-ytqm-alpha.vercel.app`.
4. Purani site par hard refresh (Ctrl+Shift+R) karein. Aapke browser ke questions wahin milenge — same origin hone ki wajah se.

> ⚠️ Naya Vercel project ya naya domain mat banayein, warna browser ka localStorage naye domain par nahi milega.

## Phase 2 — Apne browser wale questions ko file me export karo

Updated site par:

1. Logo par **5 baar click** karein → **Admin** button dikhega.
2. **Admin** → passcode `arnav0011` → apne Firebase admin account se login.
3. Admin panel → **Global sync** section → **"Download questions.json"** dabayein.
4. Ek `questions.json` file download hogi jisme Firestore + browser-stored + pehle se static questions sab merge hote hain (kuch delete/edit nahi hota).

**Agar Global sync na mile** (ya Firebase admin login nahi ho raha), manual tarika:

1. Chrome → DevTools (F12) → **Application** tab → **Local Storage** → apni site ka domain kholein.
2. Key `jee-pyq-hub:questions:v1` dhoondein.
3. Us value ko copy karke ek file me `questions.json` naam se save karein. (Agar value `{ "questions": [...] }` shape me hai to bhi chalega.)

## Phase 3 — Questions public karo

1. Downloaded `questions.json` ko repo ki **`public/questions.json`** par replace karein.
2. Commit + push → Vercel deploy.
3. Ab har visitor ko wahi question bank milega, chahe uske browser me kuch save na ho.

Verify: site kholein → **Tests** → Chapter test → Chemistry / Mathematics dono me chapters dikhne chahiye. Performance bhi Mistake book ke bagal me dikhega.

---

## Firebase wala rasta (optional, long term)

Agar aap Vercel par Firebase env vars (`NEXT_PUBLIC_FIREBASE_*`) already set rakhte hain, to admin panel se add kiye gaye questions Firestore me jaate hain aur **turant sabko dikhte hain** — bar-bar `questions.json` nahi banana padta. Is case me:

- Questions ko admin panel se add/edit karein (ya Phase 2 ki JSON ko bulk import me daalein).
- `public/questions.json` sirf offline/backup copy ki tarah rakhein.

## Cheezein jo galti se data uda sakti hain

- DevTools se localStorage clear karna (`Clear site data`).
- Firefox/Chrome me "new profile" ya incognito window use karna (wahan localStorage alag hota hai).
- `public/questions.json` ko empty `[]` / `{}` se replace karna jab tak export backup na ho.
- Localhost ya kisi doosre domain par test karna aur samajhna ki data gaya hai (wo alag origin hai).
