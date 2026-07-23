import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import type { CourseContent } from "@/server/services/claude"

export const reviewRouter = createTRPCRouter({
  getDue: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()

    const allProgress = await ctx.db.userProgress.findMany({
      where: { userId: ctx.session.user.id },
      include: { course: { select: { id: true, title: true, content: true, videoId: true } } },
    })

    return allProgress.flatMap((p) => {
      const reviewDates = p.recallReviewDates as Record<string, string>
      const dueIds = Object.entries(reviewDates)
        .filter(([, date]) => new Date(date) <= now)
        .map(([id]) => id)

      if (!dueIds.length) return []

      const content = p.course.content as CourseContent | null
      if (!content) return []

      const allQuestions = content.milestones.flatMap((m) => m.active_recall)
      return allQuestions.flatMap((q) => {
        const dueAt = reviewDates[q.id]
        if (!dueIds.includes(q.id) || !dueAt) return []
        return [{ ...q, courseId: p.courseId, courseTitle: p.course.title, dueAt }]
      })
    })
  }),

  getCount: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const allProgress = await ctx.db.userProgress.findMany({
      where: { userId: ctx.session.user.id },
      select: { recallReviewDates: true },
    })
    return allProgress.reduce((total, p) => {
      const dates = p.recallReviewDates as Record<string, string>
      return total + Object.values(dates).filter((d) => new Date(d) <= now).length
    }, 0)
  }),
})
