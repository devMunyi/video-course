"use client"

import { Button, Card, CardBody, Chip } from "@heroui/react"
import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"

type QuizOption = {
  id: string
  text: string
  is_correct: boolean
}

type QuizQuestion = {
  id: string
  question: string
  options: QuizOption[]
  explanation: string
}

type Props = {
  questions: QuizQuestion[]
  savedAnswers: Record<string, string>
  onAnswer: (questionId: string, optionId: string) => void
}

export default function Quiz({ questions, savedAnswers, onAnswer }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>({ ...savedAnswers })

  function handleSelect(qId: string, optId: string) {
    if (selected[qId]) return // already answered
    setSelected((prev) => ({ ...prev, [qId]: optId }))
    onAnswer(qId, optId)
  }

  const score = questions.filter((q) => {
    const chosen = selected[q.id]
    return chosen && q.options.find((o) => o.id === chosen)?.is_correct
  }).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <span>📝</span> Quiz
        </h3>
        {Object.keys(selected).length === questions.length && (
          <Chip
            color={
              score === questions.length
                ? "success"
                : score > questions.length / 2
                  ? "warning"
                  : "danger"
            }
            variant="flat"
            size="sm"
          >
            {score}/{questions.length} correct
          </Chip>
        )}
      </div>

      {questions.map((q, i) => {
        const answered = selected[q.id]
        const correctOption = q.options.find((o) => o.is_correct)

        return (
          <Card key={q.id} className="border border-divider">
            <CardBody className="gap-3 p-5">
              <p className="text-sm font-medium">
                <span className="mr-2 font-bold text-primary">Q{i + 1}.</span>
                {q.question}
              </p>

              <div className="flex flex-col gap-2">
                {q.options.map((opt) => {
                  const isSelected = answered === opt.id
                  const isCorrect = opt.is_correct

                  let btnColor: "default" | "success" | "danger" = "default"
                  let btnVariant: "flat" | "bordered" | "solid" = "bordered"

                  if (answered) {
                    if (isCorrect) {
                      btnColor = "success"
                      btnVariant = "flat"
                    } else if (isSelected && !isCorrect) {
                      btnColor = "danger"
                      btnVariant = "flat"
                    }
                  }

                  return (
                    <Button
                      key={opt.id}
                      onPress={() => handleSelect(q.id, opt.id)}
                      isDisabled={!!answered}
                      color={btnColor}
                      variant={btnVariant}
                      className={`h-auto min-h-10 justify-start whitespace-normal text-left text-sm ${isSelected ? "font-medium" : ""}`}
                      startContent={
                        <span className="shrink-0 text-xs font-bold uppercase opacity-60">
                          {opt.id}.
                        </span>
                      }
                    >
                      {opt.text}
                    </Button>
                  )
                })}
              </div>

              <AnimatePresence>
                {answered && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-lg p-3 text-sm ${
                      selected[q.id] === correctOption?.id
                        ? "bg-success-50 text-success-700"
                        : "bg-danger-50 text-danger-700"
                    }`}
                  >
                    <span className="font-medium">
                      {selected[q.id] === correctOption?.id
                        ? "✓ Correct! "
                        : `✗ The correct answer is "${correctOption?.text}". `}
                    </span>
                    {q.explanation}
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
