"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button, Chip, Progress, Spinner } from "@heroui/react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/trpc/react"
import type { CourseContent } from "@/server/services/claude"
import VideoEmbed from "@/components/course/VideoEmbed"
import { AnimatedDots } from "@/components/AnimatedDots"
import { ThemeToggle } from "@/components/ThemeToggle"
import ActiveRecall from "@/components/course/ActiveRecall"
import Quiz from "@/components/course/Quiz"
import MilestoneSidebar from "@/components/course/MilestoneSidebar"
import MilestoneNotes from "@/components/course/MilestoneNotes"
import toast from "react-hot-toast"

const POLL_INTERVAL = 3000

function FailedState({ courseId, errorMsg }: { courseId: string; errorMsg: string | null }) {
  const router = useRouter()
  const utils = api.useUtils()

  const retry = api.course.retry.useMutation({
    onSuccess: () => {
      void utils.course.getById.invalidate({ id: courseId })
    },
    onError: (e) => toast.error(e.message),
  })

  const del = api.course.delete.useMutation({
    onSuccess: () => router.push("/dashboard"),
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl">😔</div>
      <h2 className="text-xl font-bold">Course generation failed</h2>
      <p className="max-w-sm text-default-500">
        {errorMsg ?? "We couldn't process this video. The video may not have captions."}
      </p>
      <div className="flex gap-3">
        <Button
          color="primary"
          isLoading={retry.isPending}
          onPress={() => retry.mutate({ id: courseId })}
        >
          Retry
        </Button>
        <Button
          variant="flat"
          color="danger"
          isLoading={del.isPending}
          onPress={() => del.mutate({ id: courseId })}
        >
          Delete
        </Button>
        <Button as={Link} href="/dashboard" variant="ghost">
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}

export default function CoursePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState(0)

  const utils = api.useUtils()

  const { data: course, isLoading } = api.course.getById.useQuery(
    { id },
    {
      refetchInterval: (query) => {
        const status = query.state.data?.status
        return status === "PENDING" || status === "GENERATING" ? POLL_INTERVAL : false
      },
    },
  )

  const upsertProgress = api.progress.upsert.useMutation({
    onSuccess: () => void utils.course.getById.invalidate({ id }),
  })

  const content = course?.content as unknown as CourseContent | undefined
  const milestones = content?.milestones ?? []
  const progress = course?.progress[0]
  const completedMilestones: string[] = progress?.completedMilestones ?? []
  const quizAnswers = (progress?.quizAnswers ?? {}) as Record<string, string>
  const recallScores = (progress?.recallSelfScores ?? {}) as Record<string, string>
  const milestoneNotes = (progress?.milestoneNotes ?? {}) as Record<string, string>

  const currentMilestone = milestones[currentMilestoneIndex]

  const totalPct =
    milestones.length > 0
      ? Math.round((completedMilestones.length / milestones.length) * 100)
      : 0

  const handleRecallScore = useCallback(
    (questionId: string, score: "got_it" | "review") => {
      upsertProgress.mutate({
        courseId: id,
        recallSelfScores: { [questionId]: score },
      })
    },
    [id, upsertProgress],
  )

  const handleQuizAnswer = useCallback(
    (questionId: string, optionId: string) => {
      upsertProgress.mutate({
        courseId: id,
        quizAnswers: { [questionId]: optionId },
      })
    },
    [id, upsertProgress],
  )

  const handleSaveNote = useCallback(
    (milestoneId: string, note: string) => {
      upsertProgress.mutate({
        courseId: id,
        milestoneNotes: { [milestoneId]: note },
      })
    },
    [id, upsertProgress],
  )

  const handleCompleteMilestone = useCallback(() => {
    if (!currentMilestone) return
    const isAlreadyDone = completedMilestones.includes(currentMilestone.id)
    if (!isAlreadyDone) {
      upsertProgress.mutate({
        courseId: id,
        completedMilestones: [currentMilestone.id],
      })
    }
    if (currentMilestoneIndex < milestones.length - 1) {
      setCurrentMilestoneIndex((i) => i + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      toast.success("🎉 Course complete!")
    }
  }, [currentMilestone, completedMilestones, id, upsertProgress, currentMilestoneIndex, milestones.length])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-default-500">Course not found.</p>
        <Button as={Link} href="/dashboard" color="primary">Back to dashboard</Button>
      </div>
    )
  }

  // Generating / pending state
  if (course.status === "PENDING" || course.status === "GENERATING") {
    return (
      <div className="flex min-h-screen flex-col">
        <nav className="flex items-center justify-between border-b border-divider px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold text-primary">VideoCourse</Link>
        </nav>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Spinner size="lg" color="primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {course.status === "PENDING" ? <>Queuing your course<AnimatedDots /></> : <>Generating your course<AnimatedDots /></>}
            </h2>
            <p className="mt-1 text-default-500">
              We&apos;re extracting the transcript and building your course with AI.
              <br />This takes about 30–60 seconds.
            </p>
          </div>
          <div className="w-64">
            <Progress
              isIndeterminate
              color="primary"
              size="sm"
              aria-label="Generating..."
            />
          </div>
          <Button as={Link} href="/dashboard" variant="ghost" size="sm">
            ← Back to dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Failed state
  if (course.status === "FAILED") {
    return <FailedState courseId={id} errorMsg={course.errorMsg ?? null} />
  }

  // Ready state
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <nav className="sticky top-0 z-10 flex items-center gap-4 border-b border-divider bg-background/80 px-6 py-3 backdrop-blur">
        <Link href="/dashboard" className="text-sm font-bold text-primary">
          VideoCourse
        </Link>
        <span className="text-default-300">/</span>
        <h1 className="flex-1 truncate text-sm font-medium">{course.title}</h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="text-xs text-default-400">{totalPct}% complete</span>
          <Progress
            value={totalPct}
            size="sm"
            color="primary"
            className="w-24"
            aria-label="Course progress"
          />
        </div>
      </nav>

      {/* Main layout */}
      <div className="flex flex-1 gap-0">
        {/* Sidebar */}
        <div className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-72 shrink-0 overflow-y-auto border-r border-divider p-5 lg:block">
          <MilestoneSidebar
            milestones={milestones}
            currentIndex={currentMilestoneIndex}
            completedIds={completedMilestones}
            noteIds={Object.keys(milestoneNotes).filter((id) => milestoneNotes[id]?.trim())}
            onSelect={setCurrentMilestoneIndex}
          />

          {totalPct === 100 && (
            <div className="mt-6 rounded-xl bg-success-50 p-4 text-center text-sm text-success-700">
              🎉 Course complete!
            </div>
          )}
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
                  {/* Video */}
                  <VideoEmbed
                    videoId={course.videoId}
                    startTimestamp={currentMilestone.timestamp_start}
                  />

                  {/* Milestone header */}
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Chip size="sm" variant="flat" color="primary">
                        Milestone {currentMilestoneIndex + 1} of {milestones.length}
                      </Chip>
                      <span className="text-xs text-default-400">
                        {currentMilestone.timestamp_start} – {currentMilestone.timestamp_end}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold">{currentMilestone.title}</h2>
                    <p className="mt-2 text-default-500">{currentMilestone.description}</p>
                  </div>

                  {/* Key concepts */}
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

                  {/* Active Recall */}
                  <ActiveRecall
                    questions={currentMilestone.active_recall}
                    savedScores={recallScores}
                    onScore={handleRecallScore}
                  />

                  {/* Quiz */}
                  <Quiz
                    questions={currentMilestone.quiz}
                    savedAnswers={quizAnswers}
                    onAnswer={handleQuizAnswer}
                  />

                  {/* Notes */}
                  <MilestoneNotes
                    milestoneId={currentMilestone.id}
                    savedNote={milestoneNotes[currentMilestone.id] ?? ""}
                    onSave={handleSaveNote}
                    isSaving={upsertProgress.isPending}
                  />

                  {/* Navigation */}
                  <div className="flex items-center justify-between border-t border-divider pt-6">
                    <Button
                      variant="ghost"
                      isDisabled={currentMilestoneIndex === 0}
                      onPress={() => {
                        setCurrentMilestoneIndex((i) => i - 1)
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                    >
                      ← Previous
                    </Button>
                    <Button
                      color="primary"
                      onPress={handleCompleteMilestone}
                    >
                      {currentMilestoneIndex < milestones.length - 1
                        ? "Complete & Next →"
                        : "Complete Course 🎉"}
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
