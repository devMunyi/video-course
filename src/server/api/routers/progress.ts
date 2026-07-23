import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"

/** A note carrying no text and no drawings or images — i.e. nothing worth keeping. */
function isBlankNote(note: string) {
  if (!note) return true
  if (/<(img|excalidraw-drawing|hr|table)\b/i.test(note)) return false
  return (
    note
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length === 0
  )
}

export const progressRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        quizAnswers: z.record(z.string(), z.string()).optional(),
        recallSelfScores: z.record(z.string(), z.string()).optional(),
        completedMilestones: z.array(z.string()).optional(),
        milestoneNotes: z.record(z.string(), z.string()).optional(),
        recallReviewDates: z.record(z.string(), z.string().nullable()).optional(),
        /** Set only when the user deliberately emptied a note in a focused editor. */
        allowClearingNotes: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.userProgress.findUnique({
        where: { userId_courseId: { userId: ctx.session.user.id, courseId: input.courseId } },
      })

      const mergedQuiz: Prisma.InputJsonValue = {
        ...((existing?.quizAnswers as Record<string, string>) ?? {}),
        ...(input.quizAnswers ?? {}),
      }
      const mergedRecall: Prisma.InputJsonValue = {
        ...((existing?.recallSelfScores as Record<string, string>) ?? {}),
        ...(input.recallSelfScores ?? {}),
      }
      // A note may only be blanked when the client says the user did it on purpose.
      // A client bug once overwrote real notes with Tiptap's empty document, so
      // silently dropping content is refused here rather than trusted.
      const existingNotes = (existing?.milestoneNotes as Record<string, string>) ?? {}
      const incomingNotes = Object.fromEntries(
        Object.entries(input.milestoneNotes ?? {}).filter(([milestoneId, note]) => {
          if (!isBlankNote(note)) return true
          if (isBlankNote(existingNotes[milestoneId] ?? "")) return true
          return input.allowClearingNotes === true
        }),
      )
      const mergedNotes: Prisma.InputJsonValue = { ...existingNotes, ...incomingNotes }
      const mergedMilestones = [
        ...new Set([
          ...(existing?.completedMilestones ?? []),
          ...(input.completedMilestones ?? []),
        ]),
      ]

      // Merge review dates: null value means remove that key (question mastered)
      const baseReviewDates = (existing?.recallReviewDates as Record<string, string>) ?? {}
      const mergedReviewDates: Prisma.InputJsonValue = input.recallReviewDates
        ? Object.fromEntries(
            Object.entries({ ...baseReviewDates, ...input.recallReviewDates }).filter(
              ([, v]) => v !== null,
            ),
          )
        : baseReviewDates

      // Update study streak
      const todayUTC = new Date()
      todayUTC.setUTCHours(0, 0, 0, 0)

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { lastStudiedAt: true, currentStreak: true, longestStreak: true },
      })

      if (user) {
        const lastDate = user.lastStudiedAt ? new Date(user.lastStudiedAt) : null
        lastDate?.setUTCHours(0, 0, 0, 0)
        const lastMs = lastDate?.getTime()
        const todayMs = todayUTC.getTime()
        const yesterdayMs = todayMs - 86_400_000

        const isNewDay = lastMs !== todayMs
        if (isNewDay) {
          const newStreak = lastMs === yesterdayMs ? user.currentStreak + 1 : 1
          await ctx.db.user.update({
            where: { id: ctx.session.user.id },
            data: {
              lastStudiedAt: new Date(),
              currentStreak: newStreak,
              longestStreak: Math.max(newStreak, user.longestStreak),
            },
          })
        }
      }

      return ctx.db.userProgress.upsert({
        where: { userId_courseId: { userId: ctx.session.user.id, courseId: input.courseId } },
        create: {
          userId: ctx.session.user.id,
          courseId: input.courseId,
          quizAnswers: (input.quizAnswers ?? {}) as Prisma.InputJsonValue,
          recallSelfScores: (input.recallSelfScores ?? {}) as Prisma.InputJsonValue,
          completedMilestones: input.completedMilestones ?? [],
          milestoneNotes: (input.milestoneNotes ?? {}) as Prisma.InputJsonValue,
          recallReviewDates: mergedReviewDates,
        },
        update: {
          ...(input.quizAnswers && { quizAnswers: mergedQuiz }),
          ...(input.recallSelfScores && { recallSelfScores: mergedRecall }),
          ...(input.completedMilestones && { completedMilestones: mergedMilestones }),
          ...(input.milestoneNotes && { milestoneNotes: mergedNotes }),
          ...(input.recallReviewDates && { recallReviewDates: mergedReviewDates }),
        },
      })
    }),

  /**
   * Records where the learner left off so another device can resume.
   *
   * Deliberately separate from `upsert`: that one reads the row, reads the user,
   * may write the streak and then upserts — three or four statements. This is a
   * single upsert with no reads and no side effects, because the client calls it
   * on a slow timer. The client also throttles hard (see useRemotePositionSync),
   * so a full viewing session is a handful of writes, not one per second.
   */
  savePosition: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        milestoneId: z.string(),
        seconds: z
          .number()
          .int()
          .min(0)
          .max(24 * 60 * 60),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.userProgress.upsert({
        where: { userId_courseId: { userId: ctx.session.user.id, courseId: input.courseId } },
        create: {
          userId: ctx.session.user.id,
          courseId: input.courseId,
          lastMilestoneId: input.milestoneId,
          lastPositionSec: input.seconds,
        },
        update: {
          lastMilestoneId: input.milestoneId,
          lastPositionSec: input.seconds,
        },
        select: { id: true },
      }),
    ),

  getStreak: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { currentStreak: true, longestStreak: true, lastStudiedAt: true },
    })
    if (!user) return { currentStreak: 0, longestStreak: 0, studiedToday: false }

    const todayUTC = new Date()
    todayUTC.setUTCHours(0, 0, 0, 0)
    const lastDate = user.lastStudiedAt ? new Date(user.lastStudiedAt) : null
    lastDate?.setUTCHours(0, 0, 0, 0)
    const studiedToday = lastDate?.getTime() === todayUTC.getTime()

    return { currentStreak: user.currentStreak, longestStreak: user.longestStreak, studiedToday }
  }),
})
