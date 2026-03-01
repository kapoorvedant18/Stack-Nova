# Stack Nova

An all-in-one productivity workspace for students and builders.

Stack Nova combines projects, tasks, notes, links, emails, files, and calendar sync in one clean dashboard with authentication and smart categorization.

## Features

- Unified workspace for `Projects`, `Tasks`, `Calendar`, `Emails`, `Files`, `Notes`, and `Links`
- Google + Microsoft workspace sync support
- Smart email triage and categorization pipeline
- Auth with Supabase (signup, login, reset password)
- Light/Dark theme support
- Modern UI with React + Tailwind + shadcn/ui

## Tech Stack

- Frontend: Vite, React, TypeScript, React Router, TanStack Query
- Backend: Express (TypeScript), Node.js
- Database/ORM: PostgreSQL + Drizzle ORM
- Auth: Supabase
- Styling/UI: Tailwind CSS + shadcn/ui + Radix UI

## Project Structure

```text
src/                  # frontend app
server/               # express API
backend/integrations/ # Google/Microsoft integration adapters
shared/               # shared schemas/types
supabase/             # supabase config + SQL migrations
```

## Quick Start (Local)

### 1) Prerequisites

- Node.js 20+ recommended
- npm 10+
- Supabase project (for auth)
- PostgreSQL (optional but recommended; without it app runs in memory fallback)

### 2) Clone and install

```bash
git clone <YOUR_REPO_URL>
cd Stack-Nova
npm install
```

### 3) Configure environment

Create `.env` from `.env.example`:

```bash
# PowerShell
Copy-Item .env.example .env
```

Fill values:

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/public key |
| `VITE_API_BASE_URL` | Yes | API base URL (local: `http://localhost:3001/api`) |
| `DATABASE_URL` | Recommended | PostgreSQL connection string |
| `API_PORT` | Optional | API port (default `3001`) |
| `GROQ_API_KEY` | Optional | If used by your categorization pipeline |

### 4) Push database schema (optional but recommended)

```bash
npm run db:push
```

### 5) Run app

```bash
# Frontend + Backend together
npm run start
```

Or separately:

```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev
```

### 6) Open

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3001/health`

---

## Available Scripts

- `npm run dev` – start frontend dev server
- `npm run server` – start backend server
- `npm run start` – run frontend + backend concurrently
- `npm run build` – build frontend for production
- `npm run preview` – preview built frontend
- `npm run lint` – run ESLint
- `npm run test` – run tests once
- `npm run db:push` – apply Drizzle schema to DB

---

## Deployment (Beginner-Friendly)

### Option A: Vercel (Frontend) + Railway (Backend)

This option is ideal if Render is blocked on your network.

#### 1) Deploy backend on Railway

- Create project from GitHub repo
- Service settings:
	- Build Command: `npm install`
	- Start Command: `npm run server`
- Add env vars:
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_PUBLISHABLE_KEY`
	- `DATABASE_URL`
	- `API_PORT=3001` (optional)
- Verify: `https://<your-railway-domain>/health`

#### 2) Deploy frontend on Vercel

- Import same repo
- Build Command: `npm run build`
- Output Directory: `dist`
- Add env vars:
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_PUBLISHABLE_KEY`
	- `VITE_API_BASE_URL=https://<your-railway-domain>/api`

#### 3) Supabase auth settings

In Supabase Auth URL settings:

- Set `Site URL` to your Vercel URL
- Add Vercel URL to redirect URLs

---

## Troubleshooting

### `npm run start` fails

- Ensure `.env` exists and has Supabase values
- Check `http://localhost:3001/health`
- If port issue: change `API_PORT` in `.env` and update `VITE_API_BASE_URL`

### App shows memory fallback banner

- `DATABASE_URL` is missing/invalid
- Add valid PostgreSQL URL and restart server

### 401 from API

- User not logged in or token expired
- Re-login and retry sync calls

---

## Roadmap Ideas

- Better sync conflict resolution
- Rich analytics in dashboard
- Team collaboration and shared projects

---

## License

Private / Internal project (update as needed).
