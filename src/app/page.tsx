"use client"

import { Button, Chip } from "@heroui/react"
import Link from "next/link"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useSession } from "@/lib/auth-client"

const FEATURES = [
  {
    icon: "🗺️",
    title: "Structured Milestones",
    desc: "Videos broken into logical sections so you always know where you are and what comes next.",
  },
  {
    icon: "🎯",
    title: "Active Recall",
    desc: "Open-ended questions force retrieval practice — the single most effective study technique.",
  },
  {
    icon: "📝",
    title: "Instant Quizzes",
    desc: "Multiple-choice quizzes test your understanding and cement long-term retention.",
  },
  {
    icon: "🔁",
    title: "Spaced Repetition",
    desc: "Questions you struggle with resurface after 24 hours, then 7 days — so nothing slips through.",
  },
  {
    icon: "📓",
    title: "Milestone Notes",
    desc: "Write and auto-save your own notes per section, always in sync with what you're watching.",
  },
  {
    icon: "🏆",
    title: "Completion Certificate",
    desc: "Finish a course and download a shareable certificate to prove what you've learned.",
  },
]

const STEPS = [
  {
    step: "01",
    title: "Paste a YouTube URL",
    desc: "Any YouTube video with captions works — tutorials, lectures, talks, documentaries.",
  },
  {
    step: "02",
    title: "AI builds your course",
    desc: "Claude extracts the transcript and generates milestones, questions, and quizzes in under 60 seconds.",
  },
  {
    step: "03",
    title: "Study smarter",
    desc: "Work through milestones, test yourself, take notes, and track your progress.",
  },
]

export default function LandingPage() {
  const { data: session } = useSession()
  const isLoggedIn = !!session?.user

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-divider bg-background/80 px-6 py-4 backdrop-blur">
        <span className="text-xl font-bold text-primary">VideoCourse</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isLoggedIn ? (
            <Button as={Link} href="/dashboard" color="primary" size="sm">
              Go to dashboard →
            </Button>
          ) : (
            <>
              <Button as={Link} href="/login" variant="ghost" size="sm">
                Sign in
              </Button>
              <Button as={Link} href="/login" color="primary" size="sm">
                Get started free
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center gap-8 px-6 py-28 text-center">
        <Chip color="primary" variant="flat" size="sm" className="px-3">
          Powered by AI
        </Chip>
        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-6xl">
          Turn any YouTube video into an <span className="text-primary">interactive course</span>
        </h1>
        <p className="max-w-xl text-lg text-default-500">
          Paste a URL. Get structured milestones, active recall questions, quizzes, and spaced
          repetition — all generated in under a minute.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            as={Link}
            href={isLoggedIn ? "/dashboard" : "/login"}
            color="primary"
            size="lg"
            className="px-10"
          >
            {isLoggedIn ? "Go to your dashboard →" : "Start learning for free"}
          </Button>
          {!isLoggedIn && (
            <Button as={Link} href="/login" variant="flat" size="lg">
              See how it works ↓
            </Button>
          )}
        </div>
        {!isLoggedIn && (
          <p className="text-xs text-default-400">
            No credit card required · Up to 5 courses per day
          </p>
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-divider bg-default-50 px-6 py-20 dark:bg-default-50/5">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold">How it works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="flex flex-col gap-3">
                <span className="text-4xl font-black text-primary/20">{s.step}</span>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-default-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-center text-3xl font-bold">
            Everything you need to actually learn
          </h2>
          <p className="mb-12 text-center text-default-500">
            Not just a summary — a full learning system built around how memory actually works.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-divider bg-default-50 p-6 dark:bg-default-50/5"
              >
                <div className="mb-3 text-3xl">{f.icon}</div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm text-default-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-divider bg-primary px-6 py-20 text-center text-white">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-4 text-3xl font-bold">Ready to learn smarter?</h2>
          <p className="mb-8 text-primary-200">
            Join learners turning hours of passive watching into real, lasting knowledge.
          </p>
          <Button
            as={Link}
            href={isLoggedIn ? "/dashboard" : "/login"}
            size="lg"
            className="bg-white px-10 font-semibold text-primary hover:bg-primary-50"
          >
            {isLoggedIn ? "Go to your dashboard →" : "Get started — it's free"}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-divider px-6 py-6 text-center text-sm text-default-400">
        © {new Date().getFullYear()} VideoCourse
      </footer>
    </main>
  )
}
