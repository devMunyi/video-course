import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { ZodError } from "zod"
import { auth } from "@/server/auth"
import { db } from "@/server/db"

type CreateContextOptions = { req: Request } | { headers: Headers }

export const createTRPCContext = async (opts: CreateContextOptions) => {
  const headers = "req" in opts ? opts.req.headers : opts.headers
  const session = await auth.api.getSession({ headers })
  return { db, session, ...opts }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const createCallerFactory = t.createCallerFactory
export const createTRPCRouter = t.router

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now()
  if (t._config.isDev) {
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 200) + 50))
  }
  const result = await next()
  console.log(`[TRPC] ${path} took ${Date.now() - start}ms`)
  return result
})

export const publicProcedure = t.procedure.use(timingMiddleware)

export const protectedProcedure = t.procedure.use(timingMiddleware).use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "EXPIRED_SESSION_ERROR" })
  }
  return next({ ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } } })
})
