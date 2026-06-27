# Surge

**Live product intelligence for team quests.**

Surge is a real-time collaborative workspace where teams organize work into quests — structured missions with milestones, actions, and live presence.

<!-- todo: add screenshot -->

## Stack

- **Framework**: Next.js (App Router, Edge + Serverless)
- **Auth**: Clerk
- **Database**: Supabase PostgreSQL (direct `pg` for writes, Supabase client for reads)
- **Realtime**: Supabase Realtime (WebSocket)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Quick Start

```bash
cp .env.example .env.local   # fill in your secrets
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Required Environment

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard |
| `CLERK_SECRET_KEY` | Clerk Dashboard |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard |
| `SUPABASE_DB_HOST` | Supabase Dashboard (pooler) |
| `SUPABASE_DB_PORT` | Supabase Dashboard (pooler, default 6543) |
| `SUPABASE_DB_NAME` | Supabase Database |
| `SUPABASE_DB_USER` | Supabase Database |
| `SUPABASE_DB_PASSWORD` | Supabase Database |

See `docs/Architecture.md` for detailed deployment instructions.

## Project Structure

```
src/
  app/          Next.js App Router (routes, API, layouts)
  components/   Reusable React components
  features/     Domain modules (quests, realtime, etc.)
  lib/          Shared utilities, database, security
```

## Key Features

- **Quests** — structured projects with milestones and actions, tracking progress and momentum
- **Team Management** — role-based access (owner, admin, member), search, invites
- **Live Presence** — see who's online and active in real time
- **Activity Timeline** — every state change logged with actor identity
- **Mission Control** — health, momentum, and progress metrics
- **Command Palette** — `Cmd+K` quick navigation and search
- **Dark & Light themes** — persistent preference with system default

## Architecture Principles

- Every business mutation emits exactly one immutable domain event.
- Transactions use direct `pg` (multi-statement support); reads use the Supabase JS client.
- All mutations go through `executeDomainMutation()` which wraps the write in a transaction with event logging.
- Security headers (CSP, HSTS) are applied via middleware.

See `docs/Architecture.md` for the full design document.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |

## License

<!-- todo -->
