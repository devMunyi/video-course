import { createCallerFactory, createTRPCRouter } from "./trpc"
import { courseRouter } from "./routers/course"
import { progressRouter } from "./routers/progress"
import { topicRouter } from "./routers/topic"
import { reviewRouter } from "./routers/review"

export const appRouter = createTRPCRouter({
  course: courseRouter,
  progress: progressRouter,
  topic: topicRouter,
  review: reviewRouter,
})

export type AppRouter = typeof appRouter
export const createCaller = createCallerFactory(appRouter)
