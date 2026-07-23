# VideoCourse

Turn any YouTube video into an interactive course — strucrepetition, and progress tracking, generated in under a minutetured milestones, active recall questions, quizzes, spaced  using AI.

## Features

- **AI course generation** — paste a YouTube URL, get a structured course with milestones, key concepts, active recall questions, and quizzes in ~45 seconds
- **Spaced repetition** — questions marked "needs review" resurface after 24h, then 7 days
- **Milestone notes** — per-section notes with auto-save (1s debounce)
- **Study streak** — daily streak tracker updated on every study session
- **Course sharing** — toggle a public share link for read-only access
- **Completion certificate** — downloadable PNG certificate on 100% completion
- **Review queue** — global `/review` page listing all due questions across courses
- **Topic grouping** — courses grouped by AI-assigned topic on the dashboard
- **Search & filter** — filter by title or study state (not started / in progress / completed)
- **Weekly digest email** — automated Monday recap of streak, progress, and due reviews via Resend
- **Mobile-friendly** — bottom sheet milestone drawer on small screens
- **Dark mode** — system-aware with manual toggle

## How it works

1. Paste a YouTube URL
2. The server extracts the video transcript (up to 25k characters, timestamped)
3. A background job sends the transcript to Claude and parses the structured JSON response
4. The client polls every 3 seconds until generation completes
5. You get a milestone-by-milestone course with active recall, quizzes, notes, and progress tracking

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| API | tRPC v11 + TanStack Query |
| Auth | better-auth (Google + GitHub OAuth) |
| Database | PostgreSQL via Prisma 7 |
| AI | Anthropic Claude Sonnet |
| UI | HeroUI + Tailwind CSS v4 + Framer Motion |
| Email | Resend |
| Runtime | Bun |

## Architecture notes

**Async generation pattern** — Course creation is non-blocking. The `course.create` tRPC mutation writes a `PENDING` record to the DB and fires a `POST /api/generate/[courseId]` request without awaiting it. The client polls `course.getById` every 3 seconds while status is `PENDING` or `GENERATING`, stopping automatically once it reaches `READY` or `FAILED`.

**End-to-end type safety** — The Claude response is validated at the boundary with a Zod schema (`CourseContentSchema`) before touching the database. A schema mismatch throws immediately rather than silently storing malformed JSON. The same Zod-inferred type flows from the service layer through tRPC to React components with no manual casting.

**Spaced repetition** — `recallReviewDates` (JSON on `UserProgress`) stores per-question ISO due dates. Marking "needs review" sets due in 24h; reviewing again and marking "got it" graduates to 7 days; a second "got it" removes the question from the queue entirely.

**Study streak** — on every `progress.upsert` call, the server compares today's UTC date against `lastStudiedAt` on the `User` record. Consecutive day → increment; gap → reset to 1; same day → no-op.

**Rate limiting** — 5 courses per user per day, enforced in the tRPC mutation before any external calls are made.

## Local setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- PostgreSQL database (local or [Neon](https://neon.tech))
- Google and/or GitHub OAuth app credentials
- Anthropic API key

### Steps

```bash
# Install dependencies
bun install

# Copy and fill in env vars
cp .env.local.example .env.local

# Push schema to DB and generate Prisma client
bun run db:push
bun run db:generate

# Seed topic list
bun run db:seed

# Start dev server (port 3003)
bun run dev
```

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled) |
| `DIRECT_DATABASE_URL` | PostgreSQL direct connection (for migrations/seeds) |
| `BETTER_AUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | App base URL (`http://localhost:3003` for local dev) |
| `NEXT_PUBLIC_APP_URL` | Public app URL (same as above for local dev) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `RESEND_API_KEY` | Resend API key (weekly digest emails) |
| `OWNER_EMAIL` | Your email address |
| `CRON_SECRET` | Secret for protecting the cron endpoint — `openssl rand -hex 32` |

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/              # better-auth handler
│   │   ├── cron/weekly-digest # weekly email cron (GET + POST)
│   │   ├── generate/          # background course generation
│   │   └── trpc/              # tRPC HTTP handler
│   ├── (app)/
│   │   ├── dashboard/         # course list with topic groups, search, streak
│   │   ├── courses/[id]/      # course study page
│   │   └── review/            # global spaced repetition queue
│   ├── (auth)/                # login page
│   └── share/[id]/            # public read-only course view
├── components/course/
│   ├── ActiveRecall.tsx
│   ├── CompletionCertificate.tsx
│   ├── MilestoneNotes.tsx
│   ├── MilestoneSidebar.tsx
│   ├── Quiz.tsx
│   └── VideoEmbed.tsx
├── server/
│   ├── api/routers/           # course, progress, review, topic
│   ├── auth.ts
│   ├── db/
│   └── services/
│       ├── claude.ts          # AI generation + Zod validation
│       ├── email.ts           # Resend client + email templates
│       ├── topic.ts           # semantic topic resolution
│       └── youtube.ts         # transcript fetching
└── trpc/                      # tRPC client setup
```

## Weekly digest cron

The `/api/cron/weekly-digest` route sends each user a summary of their streak, course progress, and due review questions. It runs automatically every Monday at 8am UTC on Vercel (configured in `vercel.json`).

To trigger manually:

```bash
curl -X POST http://localhost:3003/api/cron/weekly-digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Available scripts

```bash
bun run dev           # Start dev server on port 3003
bun run build         # Type-check + build for production
bun run typecheck     # TypeScript check only
bun run check         # Biome lint + format check
bun run check:fix     # Biome lint + format auto-fix
bun run db:push       # Push schema changes to DB
bun run db:generate   # Regenerate Prisma client
bun run db:seed       # Seed topic list
bun run db:studio     # Open Prisma Studio
```
