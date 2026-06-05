# 🛠 Running Wizdent CRM Locally — Step-by-Step

A complete, beginner-friendly guide to getting the app running on your own machine with **npm**.
Follow every step in order. Estimated time: **5–10 minutes** (most of it is `npm install`).

> **TL;DR**
> ```bash
> git clone https://github.com/NEMESIS-11/Wizdent-MVP.git
> cd Wizdent-MVP
> npm install
> npm run dev
> # open http://localhost:3000
> ```

---

## 0. Prerequisites

You need three things installed. Check each with the command shown.

| Tool | Minimum version | Check it | Where to get it |
|------|-----------------|----------|-----------------|
| **Node.js** | 20.19+ (or 22+) — tested on Node 20–24 | `node -v` | https://nodejs.org (LTS) or [nvm](https://github.com/nvm-sh/nvm) |
| **npm** | 9+ (ships with Node) | `npm -v` | comes with Node.js |
| **Git** | any recent | `git --version` | https://git-scm.com |

If `node -v` prints something older than 20.19 (or errors), install the current LTS first. Using
**nvm** is the cleanest way:

```bash
# install/use Node 20 LTS with nvm
nvm install 20
nvm use 20
```

> ℹ️ **No database or Firebase setup is required.** The app ships with its Firebase connection
> details committed in `firebase-applet-config.json`, so it talks to the hosted backend out of the box.

---

## 1. Get the code

Pick **one** of the two options.

### Option A — Clone with Git (recommended)
```bash
git clone https://github.com/NEMESIS-11/Wizdent-MVP.git
cd Wizdent-MVP
```

### Option B — Download a ZIP
1. Open https://github.com/NEMESIS-11/Wizdent-MVP
2. Click the green **Code** button → **Download ZIP**.
3. Unzip it, then open a terminal **inside** the unzipped folder:
   ```bash
   cd path/to/Wizdent-MVP
   ```

> You should now be in the project root — the folder that contains `package.json`.
> Verify with `ls` (macOS/Linux) or `dir` (Windows): you should see `package.json`, `src/`, `index.html`, etc.

---

## 2. Install dependencies

This downloads every library the app needs into a local `node_modules/` folder.

```bash
npm install
```

- This reads `package.json` + `package-lock.json` and may take 1–3 minutes the first time.
- It is normal to see a few `deprecated` or `vulnerabilities` notices — they don't block anything.
- You only need to run this **once** (and again only when dependencies change after a `git pull`).

> 💡 `node_modules/` is intentionally **not** included in the repo/ZIP (it's git-ignored). That's
> exactly why this install step exists — never copy `node_modules` between machines, just run `npm install`.

---

## 3. (Optional) Environment variables

**You can skip this for normal use** — no `.env` file is required.

The only env var the build references is `GEMINI_API_KEY` (for possible future AI features); it is not
used by any current screen. If you ever need it, copy the example file and fill in a value:

```bash
cp .env.example .env.local      # then edit .env.local
```

---

## 4. Start the app (development mode)

```bash
npm run dev
```

You should see output ending with something like:

```
Server running on http://localhost:3000
```

Now open your browser to:

### 👉 http://localhost:3000

You'll land on the **Wizdent CRM login screen** (a dark page with the “W” logo). 🎉

- The dev server supports **hot reload** — save a file in `src/` and the browser updates automatically.
- To **stop** the server, return to the terminal and press **Ctrl + C**.

> ⚠️ **Heads-up:** local dev connects to the **real (shared) Firebase backend**, so any data you
> create or delete is live. Use test accounts and don't bulk-delete real records while exploring.

---

## 5. Log in

On the login screen you can use either tab:

- **Credentials** tab → enter an email + password (e.g. type `admin` for the system admin, or a test user's email).
- **Google** tab → “Continue with Google”.

> 🔐 **Login credentials are not stored in this repo** (for security). Ask a project admin for the shared
> test accounts, or see the separate **Wizdent CRM User Guide** document, which lists the test logins and
> walks through every feature by role.

---

## 6. All available npm scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the local dev server on **http://localhost:3000** (with hot reload) |
| `npm run build` | Produce an optimized production build in `dist/` (this is what gets deployed) |
| `npm run preview` | Serve the already-built `dist/` locally, to sanity-check a production build |
| `npm run lint` | Type-check the whole project (`tsc --noEmit`) — no files are changed |
| `npm run clean` | Delete the `dist/` folder |

### Try a production build locally (optional)
```bash
npm run build      # builds into dist/
npm run preview    # serves dist/ — open the URL it prints
```

---

## 7. Troubleshooting

| Symptom | Cause & fix |
|---------|-------------|
| `vite: not found` (exit code 127) | You skipped step 2. Run **`npm install`**, then `npm run dev`. |
| `npm ci` fails with *“package.json and package-lock.json … not in sync”* | Use **`npm install`** instead (it reconciles the lockfile). `npm ci` is the strict CI-only variant. |
| `Port 3000 is already in use` | Another process is on 3000. Stop it, or free the port: macOS/Linux `lsof -ti:3000 \| xargs kill`, Windows `netstat -ano \| findstr :3000` then `taskkill /PID <pid> /F`. |
| Old Node error / “Unsupported engine” | Your Node is too old. Install Node 20.19+ (`nvm install 20 && nvm use 20`) and retry. |
| Login fails / “auth” errors | Make sure you used a valid test account (see step 5). Network/firewall must allow Google Firebase. |
| Blank page after a change | Hard-refresh the browser (Cmd/Ctrl + Shift + R) to clear cached assets. |
| Want a totally clean reinstall | Delete `node_modules` and the lockfile cache, then reinstall: `rm -rf node_modules && npm install`. |

---

## 8. Project layout (so you know where things live)

```
Wizdent-MVP/
├── src/
│   ├── App.tsx                 # routes / screens
│   ├── context/AuthContext.tsx # login state + role checks
│   ├── components/             # Layout, Sidebar, shared UI
│   ├── pages/                  # Dashboard, Accounts, Visits, Products, Admin, ...
│   ├── lib/                    # firebase.ts, provisionUser.ts, utils
│   └── types.ts                # shared TypeScript models
├── index.html                  # HTML entry
├── server.ts                   # dev-only Express + Vite server (provides localhost:3000)
├── firebase-applet-config.json # Firebase connection (public client config)
├── package.json                # scripts + dependencies
└── README.md                   # project overview & deployment
```

---

## 9. What next?

- **Project overview, roles, and deployment:** see [`README.md`](README.md).
- **Full feature walkthrough + test logins:** see the *Wizdent CRM User Guide* document.
- **Deploying to production:** see the **Deployment** section of the README (it auto-deploys from the `main` branch via GitHub Actions).

You're all set — happy hacking! 🦷
