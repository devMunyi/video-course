import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pg",
    "@prisma/adapter-pg",
    "@node-rs/argon2",
    "@node-rs/bcrypt",
  ],
}

export default nextConfig
