"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button, Chip, Spinner } from "@heroui/react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/trpc/react"
import type { CourseContent } from "@/server/services/claude"
import VideoEmbed from "@/components/course/VideoEmbed"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function SharePage() {
  const { id } = useParams<{ id: string }>()
  const [currentIndex, setCurrentIndex] = useState(0)

  const { data: course, isLoading } = api.course.getShared.useQuery({ id })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl">🔒</div>
        <h2 className="text-xl font-bold">Course not available</h2>
        <p className="text-default-500">This course is private or doesn&apos;t exist.</p>
        <Button as={Link} href="/" color="primary" variant="flat">Go home</Button>
      </div>
    )
  }

  const content = course.content as unknown as CourseContent
  const milestones = content?.milestones ?? []
  const currentMilestone = milestones[currentIndex]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="sticky top-0 z-10 flex items-center gap-4 border-b border-divider bg-background/80 px-6 py-3 backdrop-blur">
        <Link href="/" className="text-sm font-bold text-primary">VideoCourse</Link>
        <span className="text-default-300">/</span>
        <h1 className="flex-1 truncate text-sm font-medium">{course.title}</h1>
        <div className="flex items-center gap-3">
          {course.topic && (
            <Chip size="sm" variant="flat" color="secondary">{course.topic.name}</Chip>
          )}
          <Chip size="sm" variant="flat" color="default">Read-only</Chip>
          <ThemeToggle />
          <Button as={Link} href="/dashboard" size="sm" color="primary" variant="flat">
            Create your own
          </Button>
        </div>
      </nav>

      <div className="flex flex-1 gap-0">
        {/* Sidebar */}
        <div className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-72 shrink-0 overflow-y-auto border-r border-divider p-5 lg:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-default-400">
            Milestones
          </p>
          {milestones.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setCurrentIndex(i)}
              className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                i === currentIndex ? "bg-primary/10 text-primary" : "text-default-600 hover:bg-default-100"
              }`}
            >
              <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i === currentIndex ? "bg-primary text-white" : "bg-default-200 text-default-500"
              }`}>
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="line-clamp-2 text-xs font-medium leading-snug">{m.title}</p>
                <p className="mt-0.5 text-xs text-default-400">
                  {m.timestamp_start} – {m.timestamp_end}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
          <div className="mx-auto max-w-3xl">
            <AnimatePresence mode="wait">
              {currentMilestone && (
                <motion.div
                  key={currentMilestone.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-8"
                >
                  <VideoEmbed
                    videoId={course.videoId}
                    startTimestamp={currentMilestone.timestamp_start}
                  />

                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Chip size="sm" variant="flat" color="primary">
                        Milestone {currentIndex + 1} of {milestones.length}
                      </Chip>
                      <span className="text-xs text-default-400">
                        {currentMilestone.timestamp_start} – {currentMilestone.timestamp_end}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold">{currentMilestone.title}</h2>
                    <p className="mt-2 text-default-500">{currentMilestone.description}</p>
                  </div>

                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                      <span>💡</span> Key Concepts
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {currentMilestone.key_concepts.map((concept, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                          {concept}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Active recall questions shown but not interactive */}
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                      <span>🎯</span> Active Recall
                      <Chip size="sm" variant="flat" color="secondary">
                        {currentMilestone.active_recall.length} questions
                      </Chip>
                    </h3>
                    <div className="flex flex-col gap-3">
                      {currentMilestone.active_recall.map((q, i) => (
                        <div key={q.id} className="rounded-xl border border-divider p-4 text-sm">
                          <p className="font-medium">
                            <span className="mr-2 font-bold text-primary">Q{i + 1}.</span>
                            {q.question}
                          </p>
                          <p className="mt-2 text-xs text-default-400 italic">
                            Sign in to reveal answers and track your progress.
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-divider pt-6">
                    <Button
                      variant="ghost"
                      isDisabled={currentIndex === 0}
                      onPress={() => {
                        setCurrentIndex((i) => i - 1)
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                    >
                      ← Previous
                    </Button>
                    <Button
                      color="primary"
                      isDisabled={currentIndex >= milestones.length - 1}
                      onPress={() => {
                        setCurrentIndex((i) => i + 1)
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                    >
                      Next →
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
