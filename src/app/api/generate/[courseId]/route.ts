import { type NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@/generated/prisma/client"
import { db } from "@/server/db"
import { generateCourse } from "@/server/services/claude"
import { resolveTopicId } from "@/server/services/topic"
import { fetchTranscript } from "@/server/services/youtube"

// Allow long-running generation (up to 5 min on Vercel)
export const maxDuration = 300

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params

  const course = await db.course.findUnique({ where: { id: courseId } })
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    await db.course.update({ where: { id: courseId }, data: { status: "GENERATING" } })

    const transcript = await fetchTranscript(course.videoId)
    const content = await generateCourse(transcript)

    const topicId = content.topic ? await resolveTopicId(content.topic, db) : null

    await db.course.update({
      where: { id: courseId },
      data: {
        status: "READY",
        title: content.title,
        description: content.description,
        topicId,
        content: content as unknown as Prisma.InputJsonValue,
        milestonesCount: content.milestones.length,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error(`[generate/${courseId}]`, msg)
    await db.course.update({
      where: { id: courseId },
      data: { status: "FAILED", errorMsg: msg },
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
