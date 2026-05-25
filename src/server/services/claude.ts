import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { env } from "@/env"

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

// ─── Zod schema for validated course output ───────────────────────────────────

const QuizOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  is_correct: z.boolean(),
})

const ActiveRecallSchema = z.object({
  id: z.string(),
  question: z.string(),
  hint: z.string(),
  sample_answer: z.string(),
})

const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(QuizOptionSchema).length(4),
  explanation: z.string(),
})

const MilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  timestamp_start: z.string(),
  timestamp_end: z.string(),
  description: z.string(),
  key_concepts: z.array(z.string()).min(2).max(6),
  active_recall: z.array(ActiveRecallSchema).min(1).max(3),
  quiz: z.array(QuizQuestionSchema).min(1).max(3),
})

export const CourseContentSchema = z.object({
  title: z.string(),
  description: z.string(),
  milestones: z.array(MilestoneSchema).min(2).max(8),
  summary: z.string(),
})

export type CourseContent = z.infer<typeof CourseContentSchema>

// ─── Generation ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert instructional designer. Your task is to transform video transcripts into structured, interactive learning courses. Always return valid JSON only — no markdown fences, no extra text.`

const USER_PROMPT = (transcript: string) => `
Transform this YouTube video transcript into an interactive course.

TRANSCRIPT:
${transcript}

Return ONLY a JSON object with this exact structure:
{
  "title": "string",
  "description": "2-3 sentence overview of what learners will gain",
  "milestones": [
    {
      "id": "milestone-1",
      "title": "string",
      "timestamp_start": "MM:SS",
      "timestamp_end": "MM:SS",
      "description": "what this section covers",
      "key_concepts": ["concept 1", "concept 2", "concept 3"],
      "active_recall": [
        {
          "id": "ar-1-1",
          "question": "open-ended question requiring deep thinking",
          "hint": "a nudge without giving the answer away",
          "sample_answer": "comprehensive model answer"
        }
      ],
      "quiz": [
        {
          "id": "q-1-1",
          "question": "multiple choice question",
          "options": [
            {"id": "a", "text": "option text", "is_correct": false},
            {"id": "b", "text": "option text", "is_correct": true},
            {"id": "c", "text": "option text", "is_correct": false},
            {"id": "d", "text": "option text", "is_correct": false}
          ],
          "explanation": "why the correct answer is right and others are wrong"
        }
      ]
    }
  ],
  "summary": "comprehensive 3-5 sentence summary of all key learnings"
}

Rules:
- Create 4-6 milestones at natural topic breaks in the content
- Each milestone: 2-3 active recall questions, 2-3 quiz questions
- Quiz: exactly 4 options, exactly 1 correct answer
- Active recall: open-ended, test deep understanding not memorization
- Use actual timestamps from the transcript
- Timestamps format: MM:SS (e.g. "03:45")
`.trim()

export async function generateCourse(transcript: string): Promise<CourseContent> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: USER_PROMPT(transcript) }],
  })

  const raw = message.content[0]
  if (raw.type !== "text") throw new Error("Unexpected response type from Claude")

  const text = raw.text.trim()
  // Strip any accidental markdown fences
  const json = text.startsWith("```") ? text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "") : text

  const parsed: unknown = JSON.parse(json)
  return CourseContentSchema.parse(parsed)
}
