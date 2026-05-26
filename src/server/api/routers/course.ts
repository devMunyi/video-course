import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { TRPCError } from "@trpc/server"
import { env } from "@/env"
import Anthropic from "@anthropic-ai/sdk"
import { resolveTopicId } from "@/server/services/topic"

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

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
        retryCount: true,
        topicId: true,
        topic: { select: { id: true, name: true } },
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
          progress: { where: { userId: ctx.session.user.id } },
        },
      })
      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" })
      }
      return course
    }),

  retry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findFirst({
        where: { id: input.id, userId: ctx.session.user.id, status: { in: ["FAILED", "PENDING"] } },
      })
      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found or not in a retryable state" })
      }
      if (course.retryCount >= 3) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Maximum retries (3) reached for this course" })
      }
      if (Date.now() - course.updatedAt.getTime() < 60_000) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait 1 minute before retrying again" })
      }

      await ctx.db.course.update({
        where: { id: input.id },
        data: { status: "PENDING", errorMsg: null, retryCount: { increment: 1 } },
      })

      void fetch(`${env.BETTER_AUTH_URL}/api/generate/${input.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(console.error)

      return { success: true }
    }),

  // Returns DB topics ranked by relevance to this course using Claude Haiku
  suggestTopics: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [course, allTopics] = await Promise.all([
        ctx.db.course.findFirst({
          where: { id: input.id, userId: ctx.session.user.id },
          select: { title: true, description: true },
        }),
        ctx.db.topic.findMany({ orderBy: { name: "asc" } }),
      ])

      if (!course?.title || allTopics.length === 0) return { suggestions: [] }

      const topicNames = allTopics.map((t) => t.name)

      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 80,
        messages: [{
          role: "user",
          content: `From the list below, pick the 3 most relevant topics for this course. Return ONLY a JSON array of 3 strings exactly as they appear in the list, no other text.\n\nTopics: ${topicNames.join(", ")}\n\nCourse title: ${course.title}\nDescription: ${course.description}`,
        }],
      })

      try {
        const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "[]"
        const names = (JSON.parse(text) as string[]).filter((s) => topicNames.includes(s)).slice(0, 3)
        const suggestions = names.map((name) => allTopics.find((t) => t.name === name)!).filter(Boolean)
        return { suggestions }
      } catch {
        return { suggestions: [] }
      }
    }),

  // Assigns an existing topic by id, or creates a new one from a name
  updateTopic: protectedProcedure
    .input(z.union([
      z.object({ id: z.string(), topicId: z.string() }),
      z.object({ id: z.string(), topicName: z.string().min(1).max(50) }),
    ]))
    .mutation(async ({ ctx, input }) => {
      let topicId: string

      if ("topicId" in input) {
        topicId = input.topicId
      } else {
        topicId = await resolveTopicId(input.topicName.trim(), ctx.db)
      }

      await ctx.db.course.updateMany({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { topicId },
      })
      return { success: true }
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
