import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"

export const topicRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.topic.findMany({ orderBy: { name: "asc" } })
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.topic.upsert({
        where: { name: input.name.trim() },
        update: {},
        create: { name: input.name.trim() },
      })
    }),
})
