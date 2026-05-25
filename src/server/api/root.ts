import { createCallerFactory, createTRPCRouter } from "./trpc"
import { courseRouter } from "./routers/course"
import { progressRouter } from "./routers/progress"

export const appRouter = createTRPCRouter({
  course: courseRouter,
  progress: progressRouter,
})

export type AppRouter = typeof appRouter
export const createCaller = createCallerFactory(appRouter)
