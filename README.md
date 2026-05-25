# VideoCourse

Turn any YouTube video into an interactive course — structured milestones, active recall questions, and quizzes, generated in under a minute using Claude AI.

## How it works

1. Paste a YouTube URL
2. The server extracts the video transcript (up to 25k characters, timestamped)
3. A background job sends the transcript to Claude claude-sonnet-4-6 and parses the structured JSON response
4. The client polls every 3 seconds until generation completes
5. You get a milestone-by-milestone course with active recall, quizzes, and progress tracking

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| API | tRPC v11 + TanStack Query |
| Auth | better-auth (Google + GitHub OAuth) |
| Database | PostgreSQL via Prisma 7 |
| AI | Anthropic Claude claude-sonnet-4-6 |
| UI | HeroUI + Tailwind CSS v4 + Framer Motion |
| Runtime | Bun |

## Architecture notes

**Async generation pattern** — Course creation is non-blocking. The `course.create` tRPC mutation writes a `PENDING` record to the DB and fires a `POST /api/generate/[courseId]` request without awaiting it. The client polls `course.getById` every 3 seconds while status is `PENDING` or `GENERATING`, stopping automatically once it reaches `READY` or `FAILED`. This avoids WebSocket complexity and keeps Vercel serverless functions within their timeout budget.

**End-to-end type safety** — The Claude response is validated at the boundary with a Zod schema (`CourseContentSchema`) before touching the database. A schema mismatch throws immediately rather than silently storing malformed JSON. The same Zod-inferred type flows from the service layer through tRPC to React components with no manual casting.

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

# Run DB migrations
bun run db:migrate

# Start dev server (port 3003)
bun run dev
```

### Environment variables

See [.env.local.example](.env.local.example) for the full list. Required:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled) |
| `DIRECT_DATABASE_URL` | PostgreSQL direct connection (for migrations) |
| `BETTER_AUTH_SECRET` | Random secret — generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | App base URL (`http://localhost:3003` for local dev) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `RESEND_API_KEY` | Resend API key (used for transactional emails) |

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # better-auth handler
│   │   ├── generate/      # background course generation endpoint
│   │   └── trpc/          # tRPC HTTP handler
│   ├── (app)/             # authenticated routes (dashboard, courses)
│   └── (auth)/            # login page
├── components/course/     # ActiveRecall, Quiz, MilestoneSidebar, VideoEmbed
├── server/
│   ├── api/routers/       # tRPC routers (course, progress)
│   ├── auth.ts            # better-auth config
│   ├── db/                # Prisma client
│   └── services/
│       ├── claude.ts      # AI generation + Zod response validation
│       └── youtube.ts     # transcript fetching
└── trpc/                  # tRPC client setup (React + server-side caller)
```

## Available scripts

```bash
bun run dev           # Start dev server on port 3003
bun run build         # Type-check + build for production
bun run typecheck     # TypeScript check only
bun run check         # Biome lint + format check
bun run check:fix     # Biome lint + format auto-fix
bun run db:migrate    # Run pending migrations (dev)
bun run db:studio     # Open Prisma Studio
```
