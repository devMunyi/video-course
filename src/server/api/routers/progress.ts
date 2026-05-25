import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import type { Prisma } from "@/generated/prisma/client"

export const progressRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        quizAnswers: z.record(z.string(), z.string()).optional(),
        recallSelfScores: z.record(z.string(), z.string()).optional(),
        completedMilestones: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.userProgress.findUnique({
        where: { userId_courseId: { userId: ctx.session.user.id, courseId: input.courseId } },
      })

      const mergedQuiz: Prisma.InputJsonValue = {
        ...(existing?.quizAnswers as Record<string, string> ?? {}),
        ...(input.quizAnswers ?? {}),
      }
      const mergedRecall: Prisma.InputJsonValue = {
        ...(existing?.recallSelfScores as Record<string, string> ?? {}),
        ...(input.recallSelfScores ?? {}),
      }
      const mergedMilestones = [
        ...new Set([
          ...(existing?.completedMilestones ?? []),
          ...(input.completedMilestones ?? []),
        ]),
      ]

      return ctx.db.userProgress.upsert({
        where: { userId_courseId: { userId: ctx.session.user.id, courseId: input.courseId } },
        create: {
          userId: ctx.session.user.id,
          courseId: input.courseId,
          quizAnswers: (input.quizAnswers ?? {}) as Prisma.InputJsonValue,
          recallSelfScores: (input.recallSelfScores ?? {}) as Prisma.InputJsonValue,
          completedMilestones: input.completedMilestones ?? [],
        },
        update: {
          ...(input.quizAnswers && { quizAnswers: mergedQuiz }),
          ...(input.recallSelfScores && { recallSelfScores: mergedRecall }),
          ...(input.completedMilestones && { completedMilestones: mergedMilestones }),
        },
      })
    }),
})
