import { courseRouter } from "./routers/course"
import { progressRouter } from "./routers/progress"
import { reviewRouter } from "./routers/review"
import { topicRouter } from "./routers/topic"
import { createCallerFactory, createTRPCRouter } from "./trpc"

export const appRouter = createTRPCRouter({
  course: courseRouter,
  progress: progressRouter,
  topic: topicRouter,
  review: reviewRouter,
})

export type AppRouter = typeof appRouter
export const createCaller = createCallerFactory(appRouter)
