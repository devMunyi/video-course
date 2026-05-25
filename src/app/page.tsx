"use client"

import Link from "next/link"
import { Button } from "@heroui/react"

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-divider px-6 py-4">
        <span className="text-xl font-bold text-primary">VideoCourse</span>
        <div className="flex gap-3">
          <Button as={Link} href="/login" variant="ghost" size="sm">
            Sign in
          </Button>
          <Button as={Link} href="/login" color="primary" size="sm">
            Get started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          Powered by AI
        </div>
        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight">
          Turn any YouTube video into an{" "}
          <span className="text-primary">interactive course</span>
        </h1>
        <p className="max-w-xl text-lg text-default-500">
          Paste a YouTube URL and get a structured course with milestones, active recall questions,
          and quizzes — generated in under a minute.
        </p>
        <Button as={Link} href="/login" color="primary" size="lg" className="px-10">
          Start learning for free
        </Button>
      </section>

      {/* Features */}
      <section className="border-t border-divider bg-default-50 px-6 py-20">
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          {[
            {
              icon: "🗺️",
              title: "Structured Milestones",
              desc: "Videos broken into logical sections so you always know where you are and what comes next.",
            },
            {
              icon: "🎯",
              title: "Active Recall",
              desc: "Open-ended questions after each section force retrieval practice — the most effective learning technique.",
            },
            {
              icon: "📝",
              title: "Instant Quizzes",
              desc: "Multiple-choice quizzes with explanations test your understanding and cement long-term retention.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-background p-6 shadow-sm">
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-default-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-divider px-6 py-6 text-center text-sm text-default-400">
        © {new Date().getFullYear()} VideoCourse
      </footer>
    </main>
  )
}
