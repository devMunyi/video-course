"use client"

import { useState } from "react"
import Link from "next/link"
import { Button, Card, CardBody, Chip, Spinner } from "@heroui/react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/trpc/react"
import { ThemeToggle } from "@/components/ThemeToggle"
import toast from "react-hot-toast"

export default function ReviewPage() {
  const utils = api.useUtils()
  const { data: dueItems, isLoading } = api.review.getDue.useQuery()

  const upsertProgress = api.progress.upsert.useMutation({
    onSuccess: () => {
      void utils.review.getDue.invalidate()
      void utils.review.getCount.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  function reveal(id: string) {
    setRevealed((prev) => new Set([...prev, id]))
  }

  function handleScore(courseId: string, questionId: string, score: "got_it" | "review") {
    upsertProgress.mutate({
      courseId,
      recallSelfScores: { [questionId]: score },
      recallReviewDates: {
        [questionId]:
          score === "review"
            ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            : null,
      },
    })

    setRevealed((prev) => {
      const next = new Set(prev)
      next.delete(questionId)
      return next
    })
  }

  // Group due items by course
  const grouped = (dueItems ?? []).reduce<
    Record<string, { courseTitle: string; items: NonNullable<typeof dueItems> }>
  >(
    (acc, item) => {
      let group = acc[item.courseId]
      if (!group) {
        group = { courseTitle: item.courseTitle, items: [] }
        acc[item.courseId] = group
      }
      group.items.push(item)
      return acc
    },
    {},
  )

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-10 flex items-center gap-4 border-b border-divider bg-background/80 px-6 py-4 backdrop-blur">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          VideoCourse
        </Link>
        <span className="text-default-300">/</span>
        <h1 className="flex-1 text-sm font-medium">Review Queue</h1>
        <ThemeToggle />
      </nav>

      <main className="mx-auto max-w-2xl px-6 py-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" color="primary" />
          </div>
        ) : !dueItems?.length ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-bold">You&apos;re all caught up!</h2>
            <p className="text-default-500">No questions due for review right now. Check back later.</p>
            <Button as={Link} href="/dashboard" color="primary" variant="flat">
              Back to dashboard
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-2xl font-bold">Due for review</h2>
              <p className="mt-1 text-default-500">
                {dueItems.length} question{dueItems.length !== 1 ? "s" : ""} to revisit today
              </p>
            </div>

            {Object.entries(grouped).map(([courseId, { courseTitle, items }]) => (
              <div key={courseId} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/courses/${courseId}`}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {courseTitle}
                  </Link>
                  <Chip size="sm" variant="flat" color="warning">
                    {items.length}
                  </Chip>
                </div>

                {items.map((item, i) => {
                  const isRevealed = revealed.has(item.id)
                  return (
                    <Card key={item.id} className="border border-divider">
                      <CardBody className="gap-3 p-5">
                        <p className="text-sm font-medium">
                          <span className="mr-2 font-bold text-primary">Q{i + 1}.</span>
                          {item.question}
                        </p>

                        {!isRevealed ? (
                          <Button size="sm" color="primary" variant="flat" onPress={() => reveal(item.id)}>
                            Reveal answer
                          </Button>
                        ) : (
                          <AnimatePresence>
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex flex-col gap-3"
                            >
                              <div className="rounded-lg bg-default-50 p-4 text-sm leading-relaxed">
                                {item.sample_answer}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  color="success"
                                  variant="flat"
                                  isDisabled={upsertProgress.isPending}
                                  onPress={() => handleScore(courseId, item.id, "got_it")}
                                >
                                  ✓ Got it
                                </Button>
                                <Button
                                  size="sm"
                                  color="warning"
                                  variant="flat"
                                  isDisabled={upsertProgress.isPending}
                                  onPress={() => handleScore(courseId, item.id, "review")}
                                >
                                  📌 Still needs review
                                </Button>
                              </div>
                            </motion.div>
                          </AnimatePresence>
                        )}
                      </CardBody>
                    </Card>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
