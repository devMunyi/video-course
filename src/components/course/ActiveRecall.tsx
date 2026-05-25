"use client"

import { useState } from "react"
import { Button, Card, CardBody, Chip } from "@heroui/react"
import { motion, AnimatePresence } from "framer-motion"

type ARQuestion = {
  id: string
  question: string
  hint: string
  sample_answer: string
}

type Props = {
  questions: ARQuestion[]
  savedScores: Record<string, string>
  onScore: (questionId: string, score: "got_it" | "review") => void
}

export default function ActiveRecall({ questions, savedScores, onScore }: Props) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [showHint, setShowHint] = useState<Set<string>>(new Set())

  function reveal(id: string) {
    setRevealed((prev) => new Set([...prev, id]))
  }

  function toggleHint(id: string) {
    setShowHint((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <span>🎯</span> Active Recall
        <Chip size="sm" variant="flat" color="secondary">{questions.length} questions</Chip>
      </h3>
      {questions.map((q, i) => {
        const isRevealed = revealed.has(q.id)
        const score = savedScores[q.id]

        return (
          <Card key={q.id} className="border border-divider">
            <CardBody className="gap-3 p-5">
              <p className="font-medium text-sm">
                <span className="mr-2 font-bold text-primary">Q{i + 1}.</span>
                {q.question}
              </p>

              {score && (
                <Chip
                  size="sm"
                  color={score === "got_it" ? "success" : "warning"}
                  variant="flat"
                >
                  {score === "got_it" ? "✓ Got it" : "📌 Needs review"}
                </Chip>
              )}

              {!isRevealed && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="flat" onPress={() => toggleHint(q.id)}>
                    {showHint.has(q.id) ? "Hide hint" : "Show hint"}
                  </Button>
                  <Button size="sm" color="primary" variant="flat" onPress={() => reveal(q.id)}>
                    Reveal answer
                  </Button>
                </div>
              )}

              <AnimatePresence>
                {showHint.has(q.id) && !isRevealed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg bg-warning-50 p-3 text-sm text-warning-700"
                  >
                    💡 {q.hint}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isRevealed && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="rounded-lg bg-default-50 p-4 text-sm leading-relaxed">
                      {q.sample_answer}
                    </div>
                    {!score && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          color="success"
                          variant="flat"
                          onPress={() => onScore(q.id, "got_it")}
                        >
                          ✓ Got it
                        </Button>
                        <Button
                          size="sm"
                          color="warning"
                          variant="flat"
                          onPress={() => onScore(q.id, "review")}
                        >
                          📌 Needs review
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
