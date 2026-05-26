import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma"
import { Pool } from "pg"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const pool = new Pool({ connectionString: process.env.DIRECT_DATABASE_URL })
const db = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const courses = await db.course.findMany({
    where: { milestonesCount: 0, status: "READY", content: { not: null } },
    select: { id: true, content: true },
  })

  console.log(`Backfilling ${courses.length} courses...`)

  for (const course of courses) {
    const content = course.content as { milestones?: unknown[] } | null
    const count = content?.milestones?.length ?? 0
    if (count > 0) {
      await db.course.update({ where: { id: course.id }, data: { milestonesCount: count } })
      console.log(`  ${course.id} → ${count} milestones`)
    }
  }

  console.log("Done.")
  await pool.end()
}

main().catch(console.error)
