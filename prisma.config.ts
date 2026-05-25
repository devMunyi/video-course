/// <reference types="node" />
import { config } from "dotenv"
config({ path: ".env.local" })
import path from "node:path"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // Neon: use direct (non-pooled) URL for migrations, pooler URL for queries
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  },
})
