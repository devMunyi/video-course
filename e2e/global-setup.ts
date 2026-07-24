import { execSync } from "node:child_process"
import { dirname } from "node:path"
import { config } from "dotenv"

// Brings up the throwaway Postgres, applies the schema, and seeds fixtures +
// storageState before the suite. Playwright's webServer then starts `next dev`
// against the same .env.test. Idempotent: safe to rerun.
//
// SAFETY: prisma.config.ts loads .env.local (production Neon) unconditionally.
// dotenv does not override already-set vars, so `dotenv -e .env.test` in front
// wins — but because a prod write already cost us data once, we verify the
// resolved URL points at the e2e DB and refuse otherwise.
export default function globalSetup() {
  const testEnv = config({ path: ".env.test" }).parsed ?? {}
  const url = testEnv.DIRECT_DATABASE_URL ?? testEnv.DATABASE_URL ?? ""
  if (!url.includes("55432") || !url.includes("video_course_e2e")) {
    throw new Error(`e2e refuses to run: .env.test DB is not the throwaway DB (${url})`)
  }

  // execSync uses /bin/sh with a minimal PATH that lacks bun; resolve it and
  // put its bin dir on PATH for the child commands.
  const bun = execSync("command -v bun || echo", { shell: "/bin/bash" }).toString().trim()
  const env = { ...process.env, PATH: `${bun ? dirname(bun) : ""}:${process.env.PATH}` }
  const run = (cmd: string) => execSync(cmd, { stdio: "inherit", cwd: process.cwd(), env })

  run("docker compose -f docker-compose.e2e.yml up -d --wait")
  // Schema straight from prisma — no migration history needed for a scratch DB.
  // --url overrides the datasource in prisma.config.ts (which loads .env.local),
  // so this can only ever touch the e2e database.
  run(`npx prisma db push --url='${url}' --accept-data-loss`)
  run(`DATABASE_URL='${url}' npx dotenv -e .env.test -- bun run e2e/seed.ts`)
}
