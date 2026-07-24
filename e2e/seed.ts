// Seeds the throwaway e2e database and writes the Playwright storageState so
// specs start authenticated. Run by global-setup, after `prisma db push`.
//
// Auth here is Google-only, so there is no credential login form to drive. We
// insert a Session row directly and sign its token into the same cookie
// better-auth would set, using better-auth's own signing so it stays valid
// across upgrades.
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { PrismaPg } from "@prisma/adapter-pg"
// @ts-expect-error — subpath export ships types as .d.mts; resolution is fine at runtime
import { makeSignature } from "better-auth/crypto"
import { PrismaClient } from "../src/generated/prisma/client"
import {
  TEST_COURSE_CONTENT,
  TEST_COURSE_ID,
  TEST_SESSION_TOKEN,
  TEST_USER,
  TEST_VIDEO_ID,
} from "./fixtures"

const DATABASE_URL = process.env.DATABASE_URL
const SECRET = process.env.BETTER_AUTH_SECRET
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3009"

if (!DATABASE_URL || !SECRET) {
  throw new Error("e2e seed needs DATABASE_URL and BETTER_AUTH_SECRET (load .env.test)")
}
if (!DATABASE_URL.includes("55432") && !DATABASE_URL.includes("video_course_e2e")) {
  // Guard against ever pointing the seed at a real database.
  throw new Error(`refusing to seed: DATABASE_URL does not look like the e2e DB (${DATABASE_URL})`)
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })

async function main() {
  // Clean slate — idempotent across reruns.
  await prisma.userProgress.deleteMany({})
  await prisma.session.deleteMany({})
  await prisma.course.deleteMany({})
  await prisma.user.deleteMany({})

  await prisma.user.create({
    data: {
      id: TEST_USER.id,
      email: TEST_USER.email,
      name: TEST_USER.name,
      emailVerified: true,
    },
  })

  await prisma.course.create({
    data: {
      id: TEST_COURSE_ID,
      userId: TEST_USER.id,
      youtubeUrl: `https://youtube.com/watch?v=${TEST_VIDEO_ID}`,
      videoId: TEST_VIDEO_ID,
      title: TEST_COURSE_CONTENT.title,
      description: TEST_COURSE_CONTENT.description,
      status: "READY",
      content: TEST_COURSE_CONTENT as object,
      milestonesCount: TEST_COURSE_CONTENT.milestones.length,
      isPublic: false,
    },
  })

  await prisma.userProgress.create({
    data: {
      userId: TEST_USER.id,
      courseId: TEST_COURSE_ID,
      completedMilestones: [],
      quizAnswers: {},
      recallSelfScores: {},
      recallReviewDates: {},
      milestoneNotes: {},
    },
  })

  await prisma.session.create({
    data: {
      id: "e2e-session-row-0000000001",
      userId: TEST_USER.id,
      token: TEST_SESSION_TOKEN,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  // Cookie value = `${token}.${HMAC-SHA256(token, secret)}`, exactly what
  // better-auth's setSignedCookie produces.
  const signature = await makeSignature(TEST_SESSION_TOKEN, SECRET)
  const cookieValue = `${TEST_SESSION_TOKEN}.${signature}`
  const { hostname } = new URL(APP_URL)

  const storageState = {
    cookies: [
      {
        name: "better-auth.session_token",
        value: cookieValue,
        domain: hostname,
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
        expires: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      },
    ],
    origins: [],
  }

  const out = join(dirname(new URL(import.meta.url).pathname), ".auth", "state.json")
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(storageState, null, 2))
  console.log(`e2e seed complete → course ${TEST_COURSE_ID}, storageState ${out}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
