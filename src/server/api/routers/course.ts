import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { TRPCError } from "@trpc/server"
import { env } from "@/env"

const YOUTUBE_URL_REGEX =
  /(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/

function extractVideoId(url: string): string | null {
  const match = YOUTUBE_URL_REGEX.exec(url)
  return match?.[1] ?? null
}

export const courseRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ youtubeUrl: z.url() }))
    .mutation(async ({ ctx, input }) => {
      const videoId = extractVideoId(input.youtubeUrl)
      if (!videoId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid YouTube URL" })
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const count = await ctx.db.course.count({
        where: { userId: ctx.session.user.id, createdAt: { gte: today } },
      })
      if (count >= 5) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Daily limit reached (5 courses per day)",
        })
      }

      const course = await ctx.db.course.create({
        data: {
          userId: ctx.session.user.id,
          youtubeUrl: input.youtubeUrl,
          videoId,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          status: "PENDING",
        },
      })

      // Fire-and-forget: kick off background generation
      void fetch(`${env.BETTER_AUTH_URL}/api/generate/${course.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(console.error)

      return { courseId: course.id }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.course.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        status: true,
        videoId: true,
        createdAt: true,
        progress: {
          where: { userId: ctx.session.user.id },
          select: { completedMilestones: true },
        },
      },
    })
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        include: {
          progress: {
            where: { userId: ctx.session.user.id },
          },
        },
      })
      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" })
      }
      return course
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.course.deleteMany({
        where: { id: input.id, userId: ctx.session.user.id },
      })
      return { success: true }
    }),
})
