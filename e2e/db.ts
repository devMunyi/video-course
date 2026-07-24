import { Pool } from "pg"
import { TEST_COURSE_ID, TEST_USER } from "./fixtures"

// Direct connection to the throwaway e2e DB. The suite shares one seeded course,
// and study-mode features (notes, and playback-position resume) write to
// UserProgress — so specs reset that row before each test to stay deterministic.
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://e2e:e2e@127.0.0.1:55432/video_course_e2e"

// Lazy + recreatable: spec files share this module, and each closes the pool in
// afterAll, so a later file must be able to reopen it.
let pool: Pool | null = null
function getPool() {
  if (!pool) pool = new Pool({ connectionString: DATABASE_URL })
  return pool
}

/** Clear notes and playback resume so every test starts on section 1, blank. */
export async function resetProgress() {
  await getPool().query(
    `UPDATE "UserProgress"
       SET "milestoneNotes" = '{}'::jsonb,
           "completedMilestones" = '{}',
           "lastMilestoneId" = NULL,
           "lastPositionSec" = NULL
     WHERE "userId" = $1 AND "courseId" = $2`,
    [TEST_USER.id, TEST_COURSE_ID],
  )
}

export async function closeDb() {
  if (!pool) return
  const p = pool
  pool = null
  await p.end()
}
