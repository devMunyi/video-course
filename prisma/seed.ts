import { config } from "dotenv"
config({ path: ".env.local" })

import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  }),
})

const INITIAL_TOPICS = [
  "Programming",
  "Web Development",
  "Mobile Development",
  "DevOps",
  "Data Science",
  "Machine Learning",
  "Cybersecurity",
  "Finance",
  "Investing",
  "Forex Trading",
  "Entrepreneurship",
  "Marketing",
  "Design",
  "UI/UX",
  "Photography",
  "Video Editing",
  "Music",
  "Language Learning",
  "Science",
  "Mathematics",
  "Health & Fitness",
  "Personal Development",
  "Business",
  "Other",
]

async function main() {
  for (const name of INITIAL_TOPICS) {
    await db.topic.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
  console.log(`Seeded ${INITIAL_TOPICS.length} topics`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
