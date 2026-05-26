import Anthropic from "@anthropic-ai/sdk"
import { env } from "@/env"
import type { PrismaClient } from "@/generated/prisma/client"

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

/**
 * Given an AI-suggested topic name, finds the best matching existing DB topic.
 * Falls back to creating a new topic only if no existing one is a reasonable fit.
 */
export async function resolveTopicId(
  suggestedName: string,
  db: PrismaClient,
): Promise<string> {
  const allTopics = await db.topic.findMany({ orderBy: { name: "asc" } })

  // 1. Exact match (case-insensitive)
  const exact = allTopics.find(
    (t) => t.name.toLowerCase() === suggestedName.toLowerCase(),
  )
  if (exact) return exact.id

  // 2. Ask Claude Haiku to semantically match against existing topics with descriptions
  const topicList = allTopics.map((t) => `- ${t.name}: ${t.description}`).join("\n")
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    messages: [{
      role: "user",
      content: `Read the topic descriptions below to understand their semantic meaning. Does any of them closely match the concept "${suggestedName}"? If yes, return ONLY the exact topic name as a plain string. If none fit well, return the word "NEW". No other text.\n\nTOPICS:\n${topicList}`,
    }],
  })

  const answer = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "NEW"
  const topicNames = allTopics.map((t) => t.name)

  if (answer !== "NEW" && topicNames.includes(answer)) {
    return allTopics.find((t) => t.name === answer)!.id
  }

  // 3. No match — create new topic
  const newTopic = await db.topic.create({ data: { name: suggestedName } })
  return newTopic.id
}
