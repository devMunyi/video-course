import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/env"
import { db } from "@/server/db"
import { resend, weeklyDigestHtml } from "@/server/services/email"

async function handler(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      currentStreak: true,
      longestStreak: true,
      lastStudiedAt: true,
      courses: {
        where: { status: "READY" },
        select: {
          milestonesCount: true,
          progress: { select: { completedMilestones: true, recallReviewDates: true } },
        },
      },
    },
  })

  const now = new Date()
  const appUrl = env.NEXT_PUBLIC_APP_URL

  let sent = 0
  const errors: string[] = []

  for (const user of users) {
    try {
      const todayUTC = new Date()
      todayUTC.setUTCHours(0, 0, 0, 0)
      const lastDate = user.lastStudiedAt ? new Date(user.lastStudiedAt) : null
      lastDate?.setUTCHours(0, 0, 0, 0)
      const studiedToday = lastDate?.getTime() === todayUTC.getTime()

      let readyCourses = 0
      let inProgressCourses = 0
      let reviewDue = 0

      for (const course of user.courses) {
        const prog = course.progress[0]
        const completed = prog?.completedMilestones?.length ?? 0
        const total = course.milestonesCount

        if (completed === 0) readyCourses++
        else if (completed < total) inProgressCourses++

        const reviewDates = (prog?.recallReviewDates ?? {}) as Record<string, string>
        reviewDue += Object.values(reviewDates).filter((d) => new Date(d) <= now).length
      }

      const html = weeklyDigestHtml({
        name: user.name,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        studiedToday,
        readyCourses,
        inProgressCourses,
        reviewDue,
        appUrl,
      })

      await resend.emails.send({
        from: "VideoCourse <info@zidi.digital>",
        to: user.email,
        subject: `Your weekly learning digest 📚`,
        html,
      })

      sent++
    } catch (err) {
      errors.push(`${user.email}: ${String(err)}`)
    }
  }

  return NextResponse.json({ sent, errors })
}

export const GET = handler
export const POST = handler
