/**
 * One-off recovery: copy milestoneNotes from a Neon point-in-time branch back
 * into production, for notes destroyed by the empty-editor bug (fixed in c2de15f).
 *
 * Reads both connection strings from .env.local:
 *   DATABASE_URL          production (destination)
 *   RECOVER_DATABASE_URL  point-in-time branch (source, read-only here)
 *
 * Run with:  bun --env-file=.env.local scripts/restore-notes.ts <courseId>
 * Add --write to actually apply; without it the script only reports.
 */
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

const courseId = process.argv[2]
const doWrite = process.argv.includes("--write")

if (!courseId) {
  console.error("usage: bun --env-file=.env.local scripts/restore-notes.ts <courseId> [--write]")
  process.exit(1)
}

const prodUrl = process.env.DATABASE_URL
const recoverUrl = process.env.RECOVER_DATABASE_URL
if (!prodUrl || !recoverUrl) {
  console.error("Need both DATABASE_URL and RECOVER_DATABASE_URL in .env.local")
  process.exit(1)
}

const source = new PrismaClient({ adapter: new PrismaPg({ connectionString: recoverUrl }) })
const dest = new PrismaClient({ adapter: new PrismaPg({ connectionString: prodUrl }) })

function describe(notes: Record<string, string>) {
  return Object.entries(notes)
    .map(([k, v]) => {
      const text = v
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim()
      const images = (v.match(/<img\b/g) ?? []).length
      const drawings = (v.match(/<excalidraw-drawing\b/g) ?? []).length
      return `    ${k}: ${v.length} chars, ${text.length} chars of text, ${images} image(s), ${drawings} drawing(s)`
    })
    .join("\n")
}

const sourceRows = await source.userProgress.findMany({
  where: { courseId },
  select: { userId: true, milestoneNotes: true },
})
const destRows = await dest.userProgress.findMany({
  where: { courseId },
  select: { id: true, userId: true, milestoneNotes: true },
})

console.log(`source rows: ${sourceRows.length}, destination rows: ${destRows.length}\n`)

for (const src of sourceRows) {
  const target = destRows.find((r) => r.userId === src.userId)
  const srcNotes = (src.milestoneNotes ?? {}) as Record<string, string>
  const dstNotes = (target?.milestoneNotes ?? {}) as Record<string, string>

  console.log(`user ${src.userId}`)
  console.log("  recovered:")
  console.log(describe(srcNotes) || "    (none)")
  console.log("  currently in production:")
  console.log(describe(dstNotes) || "    (none)")

  if (!target) {
    console.log("  !! no matching production row; skipping\n")
    continue
  }

  // Keep whichever note has real content — never let a blank overwrite a real one
  const merged: Record<string, string> = { ...dstNotes }
  let restored = 0
  for (const [milestoneId, note] of Object.entries(srcNotes)) {
    const current = dstNotes[milestoneId] ?? ""
    const currentIsBlank =
      current.replace(/<[^>]*>/g, "").trim() === "" && !/<(img|excalidraw-drawing)\b/i.test(current)
    const recoveredHasContent =
      note.replace(/<[^>]*>/g, "").trim() !== "" || /<(img|excalidraw-drawing)\b/i.test(note)
    if (currentIsBlank && recoveredHasContent) {
      merged[milestoneId] = note
      restored++
    }
  }

  console.log(`  -> would restore ${restored} note(s)`)
  if (doWrite && restored > 0) {
    await dest.userProgress.update({
      where: { id: target.id },
      data: { milestoneNotes: merged },
    })
    console.log("  -> written")
  }
  console.log()
}

if (!doWrite) console.log("Dry run. Re-run with --write to apply.")

await source.$disconnect()
await dest.$disconnect()
