import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().optional(),
    OWNER_EMAIL: z.string().email(),
    CRON_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    OWNER_EMAIL: process.env.OWNER_EMAIL,
    CRON_SECRET: process.env.CRON_SECRET,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
