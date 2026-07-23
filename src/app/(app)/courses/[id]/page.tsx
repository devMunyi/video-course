"use client"

import {
  Button,
  Chip,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  Progress,
  Spinner,
} from "@heroui/react"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { AnimatedDots } from "@/components/AnimatedDots"
import ActiveRecall from "@/components/course/ActiveRecall"
import CompletionCertificate from "@/components/course/CompletionCertificate"
import MilestoneNotes from "@/components/course/MilestoneNotes"
import MilestoneSidebar from "@/components/course/MilestoneSidebar"
import PositionSync from "@/components/course/PositionSync"
import Quiz from "@/components/course/Quiz"
import StudyMode from "@/components/course/StudyMode"
import { useNoteDraft } from "@/components/course/use-note-draft"
import VideoEmbed from "@/components/course/VideoEmbed"
import { VideoPlayerProvider } from "@/components/course/video-player-context"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useSession } from "@/lib/auth-client"
import { isEmptyNote } from "@/lib/note-html"
import { loadPosition } from "@/lib/playback-store"
import type { CourseContent } from "@/server/services/claude"
import { api } from "@/trpc/react"

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
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState(0)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [showCertificate, setShowCertificate] = useState(false)
  const [studyMode, setStudyMode] = useState(false)
  const { data: session } = useSession()

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
    onSuccess: () => {
      void utils.course.getById.invalidate({ id })
      void utils.review.getCount.invalidate()
    },
  })

  const setPublic = api.course.setPublic.useMutation({
    onSuccess: ({ isPublic }) => {
      void utils.course.getById.invalidate({ id })
      if (isPublic) {
        const url = `${window.location.origin}/share/${id}`
        void navigator.clipboard.writeText(url)
        toast.success("Share link copied to clipboard!")
      } else {
        toast.success("Course is now private")
      }
    },
    onError: (e) => toast.error(e.message),
  })

  const content = course?.content as unknown as CourseContent | undefined
  const milestones = content?.milestones ?? []
  const progress = course?.progress[0]
  const completedMilestones: string[] = progress?.completedMilestones ?? []
  const quizAnswers = (progress?.quizAnswers ?? {}) as Record<string, string>
  const recallScores = (progress?.recallSelfScores ?? {}) as Record<string, string>
  const milestoneNotes = (progress?.milestoneNotes ?? {}) as Record<string, string>
  const recallReviewDates = (progress?.recallReviewDates ?? {}) as Record<string, string>

  const currentMilestone = milestones[currentMilestoneIndex]

  // On a reload, land back on the milestone that was open rather than the first one.
  // Runs once, and only before the learner has navigated themselves.
  const [hasRestored, setHasRestored] = useState(false)
  useEffect(() => {
    if (hasRestored || milestones.length === 0) return
    setHasRestored(true)
    // This device's own position wins; the synced one covers a new device
    const milestoneId = loadPosition(id)?.milestoneId ?? progress?.lastMilestoneId
    if (!milestoneId) return
    const index = milestones.findIndex((m) => m.id === milestoneId)
    if (index > 0) setCurrentMilestoneIndex(index)
  }, [id, milestones, hasRestored, progress?.lastMilestoneId])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable)
        return
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setCurrentMilestoneIndex((i) => {
          if (i < milestones.length - 1) {
            window.scrollTo({ top: 0, behavior: "smooth" })
            return i + 1
          }
          return i
        })
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrentMilestoneIndex((i) => {
          if (i > 0) {
            window.scrollTo({ top: 0, behavior: "smooth" })
            return i - 1
          }
          return i
        })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [milestones.length])

  const totalPct =
    milestones.length > 0 ? Math.round((completedMilestones.length / milestones.length) * 100) : 0

  const handleRecallScore = useCallback(
    (questionId: string, score: "got_it" | "review") => {
      let reviewDate: string | null = null
      if (score === "review") {
        // Due in 24 hours
        reviewDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      } else if (recallReviewDates[questionId]) {
        // Was in review queue and now got it → graduate to 7 days
        reviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
      upsertProgress.mutate({
        courseId: id,
        recallSelfScores: { [questionId]: score },
        recallReviewDates: { [questionId]: reviewDate },
      })
    },
    [id, upsertProgress, recallReviewDates],
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
    (milestoneId: string, note: string, allowClearing: boolean) => {
      upsertProgress.mutate({
        courseId: id,
        milestoneNotes: { [milestoneId]: note },
        allowClearingNotes: allowClearing,
      })
    },
    [id, upsertProgress],
  )

  // Single autosave owner for the note, shared by the inline editor and study mode
  const noteDraft = useNoteDraft({
    milestoneId: currentMilestone?.id ?? "",
    savedNote: currentMilestone ? (milestoneNotes[currentMilestone.id] ?? "") : "",
    onSave: handleSaveNote,
    isSaving: upsertProgress.isPending,
  })

  const goToMilestone = useCallback((next: number) => {
    setCurrentMilestoneIndex(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

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
      setShowCertificate(true)
    }
  }, [
    currentMilestone,
    completedMilestones,
    id,
    upsertProgress,
    currentMilestoneIndex,
    milestones.length,
  ])

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
        <Button as={Link} href="/dashboard" color="primary">
          Back to dashboard
        </Button>
      </div>
    )
  }

  // Generating / pending state
  if (course.status === "PENDING" || course.status === "GENERATING") {
    return (
      <div className="flex min-h-screen flex-col">
        <nav className="flex items-center justify-between border-b border-divider px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            VideoCourse
          </Link>
        </nav>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Spinner size="lg" color="primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {course.status === "PENDING" ? (
                <>
                  Queuing your course
                  <AnimatedDots />
                </>
              ) : (
                <>
                  Generating your course
                  <AnimatedDots />
                </>
              )}
            </h2>
            <p className="mt-1 text-default-500">
              We&apos;re extracting the transcript and building your course with AI.
              <br />
              This takes about 30–60 seconds.
            </p>
          </div>
          <div className="w-64">
            <Progress isIndeterminate color="primary" size="sm" aria-label="Generating..." />
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
    <VideoPlayerProvider
      courseId={id}
      remoteMilestoneId={progress?.lastMilestoneId}
      remoteSeconds={progress?.lastPositionSec}
    >
      <div className="flex min-h-screen flex-col bg-background">
        <PositionSync courseId={id} milestoneId={currentMilestone?.id} />
        {studyMode && currentMilestone && (
          <StudyMode
            videoId={course.videoId}
            milestones={milestones}
            index={currentMilestoneIndex}
            note={noteDraft.value}
            onNoteChange={noteDraft.onChange}
            status={noteDraft.status}
            onSelectMilestone={(i) =>
              goToMilestone(Math.min(milestones.length - 1, Math.max(0, i)))
            }
            onExit={() => setStudyMode(false)}
            completedIds={completedMilestones}
            noteIds={Object.keys(milestoneNotes).filter((mid) => !isEmptyNote(milestoneNotes[mid]))}
          />
        )}
        {/* Top bar */}
        <nav className="sticky top-0 z-10 flex items-center gap-4 border-b border-divider bg-background/80 px-6 py-3 backdrop-blur">
          <Link href="/dashboard" className="text-sm font-bold text-primary">
            VideoCourse
          </Link>
          <span className="text-default-300">/</span>
          <h1 className="flex-1 truncate text-sm font-medium">{course.title}</h1>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="flat" color="primary" onPress={() => setStudyMode(true)}>
              Study mode
            </Button>
            <Button as={Link} href={`/courses/${id}/notes`} size="sm" variant="ghost">
              All notes
            </Button>
            <Button
              size="sm"
              variant={course.isPublic ? "flat" : "ghost"}
              color={course.isPublic ? "success" : "default"}
              isLoading={setPublic.isPending}
              onPress={() => setPublic.mutate({ id, isPublic: !course.isPublic })}
            >
              {course.isPublic ? "🔗 Shared" : "Share"}
            </Button>
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

        {/* Main layout — not rendered while study mode is open, so its VideoEmbed
            doesn't run a second YouTube player competing with study mode's.
            CSS hiding is not enough: a hidden iframe keeps playing. */}
        {!studyMode && (
        <div className="flex flex-1 gap-0">
          {/* Sidebar */}
          <div className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-72 shrink-0 overflow-y-auto border-r border-divider p-5 lg:block">
            <MilestoneSidebar
              milestones={milestones}
              currentIndex={currentMilestoneIndex}
              completedIds={completedMilestones}
              noteIds={Object.keys(milestoneNotes).filter((id) => !isEmptyNote(milestoneNotes[id]))}
              onSelect={setCurrentMilestoneIndex}
            />

            {totalPct === 100 && (
              <div className="mt-6 flex flex-col items-center gap-2 rounded-xl bg-success-50 p-4 text-center text-sm text-success-700">
                🎉 Course complete!
                <Button
                  size="sm"
                  color="success"
                  variant="flat"
                  onPress={() => setShowCertificate(true)}
                >
                  View Certificate
                </Button>
              </div>
            )}
          </div>

          {/* Content */}
          <main className="flex-1 overflow-y-auto px-6 py-8 pb-24 lg:pb-8 lg:px-10">
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
                      sectionKey={currentMilestone.id}
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

                    {/* Notes — kept directly under the video so taking notes while
                      watching doesn't mean scrolling past the whole milestone */}
                    <MilestoneNotes
                      value={noteDraft.value}
                      onChange={noteDraft.onChange}
                      status={noteDraft.status}
                      onOpenStudyMode={() => setStudyMode(true)}
                      milestones={milestones}
                      currentIndex={currentMilestoneIndex}
                      onSelectMilestone={goToMilestone}
                    />

                    {/* Key concepts */}
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                        <span>💡</span> Key Concepts
                      </h3>
                      <ul className="flex flex-col gap-2">
                        {currentMilestone.key_concepts.map((concept) => (
                          <li key={concept} className="flex items-start gap-2 text-sm">
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
                      isSaving={upsertProgress.isPending}
                    />

                    {/* Quiz */}
                    <Quiz
                      questions={currentMilestone.quiz}
                      savedAnswers={quizAnswers}
                      onAnswer={handleQuizAnswer}
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
                      <Button color="primary" onPress={handleCompleteMilestone}>
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
        )}

        {/* Mobile milestone bar */}
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-divider bg-background/90 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left"
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                currentMilestone && completedMilestones.includes(currentMilestone.id)
                  ? "bg-success text-white"
                  : "bg-primary text-white"
              }`}
            >
              {currentMilestone && completedMilestones.includes(currentMilestone.id)
                ? "✓"
                : currentMilestoneIndex + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{currentMilestone?.title}</p>
              <p className="text-xs text-default-400">
                Milestone {currentMilestoneIndex + 1} of {milestones.length} · {totalPct}% complete
              </p>
            </div>
            <svg
              aria-hidden="true"
              className="size-4 shrink-0 text-default-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Completion certificate */}
        <CompletionCertificate
          isOpen={showCertificate}
          onClose={() => setShowCertificate(false)}
          courseTitle={course.title}
          userName={session?.user.name ?? "Student"}
          completedAt={new Date()}
        />

        {/* Mobile milestone drawer */}
        <Drawer
          isOpen={mobileDrawerOpen}
          onOpenChange={setMobileDrawerOpen}
          placement="bottom"
          classNames={{ base: "lg:hidden max-h-[80vh]" }}
        >
          <DrawerContent>
            <DrawerHeader className="border-b border-divider pb-3 text-base font-semibold">
              Milestones
            </DrawerHeader>
            <DrawerBody className="overflow-y-auto py-3">
              <MilestoneSidebar
                milestones={milestones}
                currentIndex={currentMilestoneIndex}
                completedIds={completedMilestones}
                noteIds={Object.keys(milestoneNotes).filter(
                  (id) => !isEmptyNote(milestoneNotes[id]),
                )}
                onSelect={(i) => {
                  setCurrentMilestoneIndex(i)
                  setMobileDrawerOpen(false)
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
              />
              {totalPct === 100 && (
                <div className="mt-4 rounded-xl bg-success-50 p-4 text-center text-sm text-success-700">
                  🎉 Course complete!
                </div>
              )}
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </div>
    </VideoPlayerProvider>
  )
}
