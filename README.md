# 🦷 Wizdent SFA CRM

**Field Sales Automation & Visit Management for dental-product distribution.**

Wizdent is a web app that lets field sales reps (Dealers) plan and run visits to dental
clinics — logging products sold, demoed and sampled, with GPS-verified check-in / check-out —
while Managers track their territory and Admins run the whole system (team, catalog, master data).

> Single-page React app backed by Google Firebase (Authentication + Firestore). It is a website:
> open it in any modern browser. It is also mobile-responsive.

---

## ✨ What's inside

| Area | Highlights |
|------|------------|
| **Auth** | Email/Password and Google sign-in (Firebase Auth) |
| **Dashboard** | Revenue / visits / conversion KPIs + charts (role-scoped) |
| **Accounts** | Clinics & dealer partners, bulk import, territory filtering |
| **Visits** | Plan → GPS check-in → log sales/demos/samples → check-out |
| **Products** | Dental SKU catalog with multi-tier pricing |
| **Reports** | Dealer / clinic / margin analytics |
| **Admin** | Create users, provision dealers, bulk XLSX/CSV import |

---

## 👥 User roles

The app has three roles; each unlocks a different set of screens and powers.

| Role | Who they are | Can do |
|------|--------------|--------|
| **ADMIN** | System owner / operator | Everything: create users (any role), provision dealers, bulk import, manage catalog & accounts, global view of all data |
| **MANAGER** | Territory sales manager | Territory-scoped dashboards, accounts and analytics reports (read-heavy oversight) |
| **DEALER** | Field sales rep | Plan & execute visits (the only role that does GPS check-in/out and logs sales), sees only their own data |

Access is enforced both in the UI and by **Firestore security rules** (see [`firestore.rules`](firestore.rules)).

> 🔐 **Test login credentials are not stored in this repo for security.** Ask a project admin
> for the shared test accounts, or create one from the in-app **Control Tower** (Admin → Identity Monitor).

---

## 🛠 Tech stack

- **Frontend:** React 19 + TypeScript, Vite, React Router 7
- **Styling:** Tailwind CSS 4, lucide-react icons, Recharts (charts), Motion (animation)
- **Backend-as-a-service:** Firebase Auth + Cloud Firestore
- **Data import:** SheetJS (`xlsx`)
- **Dev server:** Express + Vite middleware ([`server.ts`](server.ts))

---

## 🚀 Run locally

**Prerequisites:** [Node.js](https://nodejs.org/) 18+ (and npm).

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open the app
#    → http://localhost:3000
```

That's it — the Firebase web config is committed in
[`firebase-applet-config.json`](firebase-applet-config.json), so the app connects to its
backend out of the box. **No `.env` file is required** for the core CRM.

> _Optional:_ `.env.local` may hold a `GEMINI_API_KEY` (see [`.env.example`](.env.example))
> for future AI features. It is not needed by any current screen.

### Available scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the local dev server on **http://localhost:3000** |
| `npm run build` | Type-aware production build into `dist/` (what gets deployed) |
| `npm run preview` | Serve the built `dist/` locally to sanity-check a build |
| `npm run lint` | Type-check the project (`tsc --noEmit`) |
| `npm run clean` | Remove the `dist/` folder |

---

## 📦 Deployment

> 🏠 **Hosting ownership — please read.** The current **live deployment runs on the project
> owner's personal Firebase account** (project `gen-lang-client-0785784451`). It exists for
> demo/evaluation only. **For real production use, clone this repository locally and create a
> fresh deployment under the company's own infrastructure** — a company-owned Firebase project
> and Hosting site, with the company's own credentials, billing and the GitHub Action secret
> repointed accordingly. Do not treat the personal deployment as production.

This project deploys to **Firebase Hosting** (static SPA). There are two ways:

### 1. Automatic (recommended) — push to `main`
A GitHub Action ([`.github/workflows/firebase-hosting-merge.yml`](.github/workflows/firebase-hosting-merge.yml))
runs on every push to `main`: it executes `npm run build` and deploys `dist/` to the **live**
Hosting channel. Open a **pull request** instead and a second workflow deploys a temporary
**preview** channel so you can verify before merging.

> ⚠️ `dist/` is git-ignored on purpose — CI rebuilds it. Just make sure all your **source**
> changes (including any new files) are committed, or the CI build will fail.

### 2. Manual
```bash
npm install -g firebase-tools     # once
firebase login                    # once
npm run build
firebase deploy --only hosting
```
Requires access to the Firebase project `gen-lang-client-0785784451`.

### Moving to the company's own servers
To deploy this app for real (off the owner's personal account), do a fresh setup against a
company-owned Firebase project:

1. **Create a new Firebase project** in the company's Google Cloud / Firebase org and enable
   **Authentication** (Email/Password + Google) and **Cloud Firestore**.
2. **Repoint the app config:** replace the values in
   [`firebase-applet-config.json`](firebase-applet-config.json) with the new project's web config,
   and set the new project id in [`.firebaserc`](.firebaserc).
3. **Publish the rules:** `firebase deploy --only firestore:rules` (uses [`firestore.rules`](firestore.rules)).
4. **Deploy hosting:** `npm run build && firebase deploy --only hosting`.
5. **(Optional) CI:** in the new repo's GitHub settings, add the
   `FIREBASE_SERVICE_ACCOUNT_…` secret for the company project and update the project id in the
   two workflows under [`.github/workflows/`](.github/workflows/).
6. **Seed data & first admin:** create the first admin account, then onboard the rest of the team
   from the in-app **Control Tower**.

> **Architecture note:** in production there is **no custom backend** — only static files on
> Firebase Hosting. The Express server in [`server.ts`](server.ts) is **dev-only** (it provides
> the Vite middleware). Privileged actions like creating users run client-side through the
> Firebase SDK (an admin-gated Firestore write), so they work on static hosting without a server.

---

## 🗂 Project structure

```
src/
├── App.tsx                 # Routes (all screens are protected routes)
├── main.tsx                # App entry
├── context/AuthContext.tsx # Auth state + role helpers (isAdmin / isManager / isDealer)
├── components/             # Layout, Sidebar, BulkImporter, shared UI
├── pages/                  # Dashboard, Accounts, Visits, Products, Reports, AdminManagement, ...
├── lib/                    # firebase.ts, provisionUser.ts, utils, seed data
├── constants.ts            # Regions / states / territories master data
└── types.ts                # Shared TypeScript models & enums

firebase-applet-config.json # Firebase web config (public client keys)
firestore.rules             # Firestore security rules (role-based access)
firebase.json               # Hosting config
server.ts                   # Dev-only Express + Vite server
```

---

## 🧭 Where to look first (new devs)

1. **Routing & screens:** [`src/App.tsx`](src/App.tsx)
2. **Who am I / role checks:** [`src/context/AuthContext.tsx`](src/context/AuthContext.tsx)
3. **Navigation map:** [`src/components/Sidebar.tsx`](src/components/Sidebar.tsx)
4. **The core workflow:** [`src/pages/PlanVisit.tsx`](src/pages/PlanVisit.tsx) → [`src/pages/VisitDetail.tsx`](src/pages/VisitDetail.tsx)
5. **Access rules:** [`firestore.rules`](firestore.rules)
