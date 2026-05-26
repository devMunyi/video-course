import { config } from "dotenv"
config({ path: ".env.local" })

import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  }),
})

const TOPICS: { name: string; description: string }[] = [
  { name: "Programming", description: "General coding concepts, algorithms, data structures, software engineering principles, and programming paradigms across any language." },
  { name: "Web Development", description: "Building websites and web applications — HTML, CSS, JavaScript, frontend frameworks (React, Vue, Angular), backend APIs, databases, and deployment." },
  { name: "Mobile Development", description: "Building apps for iOS and Android using Swift, Kotlin, React Native, Flutter, or other mobile frameworks." },
  { name: "DevOps", description: "CI/CD pipelines, containerisation (Docker, Kubernetes), cloud infrastructure, automation, monitoring, and deployment workflows." },
  { name: "Data Science", description: "Data analysis, visualisation, statistics, pandas, NumPy, Jupyter notebooks, and deriving insights from datasets." },
  { name: "Artificial Intelligence", description: "AI concepts, applications, tools like ChatGPT and Copilot, prompt engineering, AI ethics, and the broad landscape of artificial intelligence beyond model training." },
  { name: "Machine Learning", description: "Training and fine-tuning models, neural networks, deep learning, NLP, computer vision, PyTorch, TensorFlow, and the mathematical foundations of ML." },
  { name: "Cybersecurity", description: "Security vulnerabilities, penetration testing, ethical hacking, encryption, authentication, secure coding practices, and protecting systems." },
  { name: "Finance", description: "Personal finance, budgeting, financial literacy, accounting, taxes, credit, loans, and understanding money management." },
  { name: "Investing", description: "Stock markets, ETFs, index funds, portfolio management, dividends, retirement accounts, and long-term wealth building strategies." },
  { name: "Forex Trading", description: "Currency trading, forex markets, technical analysis, chart patterns, trading strategies, risk management, and forex-specific concepts." },
  { name: "Entrepreneurship", description: "Starting and growing a business, product-market fit, fundraising, team building, go-to-market strategies, and founder mindset." },
  { name: "Marketing", description: "Digital marketing, SEO, content marketing, social media, paid ads, email campaigns, branding, and customer acquisition." },
  { name: "Design", description: "Visual design principles, colour theory, typography, branding, graphic design tools like Figma, Illustrator, or Photoshop." },
  { name: "UI/UX", description: "User interface design, user experience research, wireframing, prototyping, usability testing, and designing intuitive digital products." },
  { name: "Photography", description: "Camera techniques, composition, lighting, editing in Lightroom or Photoshop, and photography genres like portrait or landscape." },
  { name: "Video Editing", description: "Editing footage in Premiere Pro, DaVinci Resolve, or Final Cut, colour grading, audio mixing, motion graphics, and storytelling through video." },
  { name: "Music", description: "Music theory, instruments, production, mixing, recording, DAWs like Ableton or Logic, and music genres." },
  { name: "Language Learning", description: "Learning foreign languages, grammar, vocabulary, speaking practice, pronunciation, and language acquisition methods." },
  { name: "Science", description: "Physics, chemistry, biology, astronomy, and scientific concepts explained from foundational to advanced levels." },
  { name: "Mathematics", description: "Algebra, calculus, statistics, geometry, linear algebra, discrete maths, and mathematical problem-solving." },
  { name: "Health & Fitness", description: "Exercise routines, nutrition, weight loss, muscle building, mental health, sleep, and general physical wellbeing." },
  { name: "Personal Development", description: "Productivity, habits, mindset, goal-setting, communication skills, time management, and self-improvement frameworks." },
  { name: "Business", description: "Business strategy, operations, management, leadership, organisational structure, negotiation, and running a company." },
  { name: "Other", description: "Topics that don't clearly fit any of the above categories." },
]

async function main() {
  for (const topic of TOPICS) {
    await db.topic.upsert({
      where: { name: topic.name },
      update: { description: topic.description },
      create: { name: topic.name, description: topic.description },
    })
  }
  console.log(`Seeded ${TOPICS.length} topics with descriptions`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
