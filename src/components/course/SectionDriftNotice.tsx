"use client"

import { Button } from "@heroui/react"
import { ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { usePlayingSection } from "./use-playing-section"

type SectionLike = { id: string; title: string; timestamp_start: string; timestamp_end: string }

type Props = {
  milestones: SectionLike[]
  /** Milestone the notes are currently bound to. */
  currentIndex: number
  onSelectMilestone: (index: number) => void
  className?: string
}

const FOLLOW_KEY = "notes-follow-video"

/**
 * The video plays past section boundaries while the notes stay on the milestone
 * that was last opened, so notes can silently land in the wrong section. This
 * makes the mismatch visible and offers a one-click correction.
 */
export default function SectionDriftNotice({
  milestones,
  currentIndex,
  onSelectMilestone,
  className = "",
}: Props) {
  const playingIndex = usePlayingSection(milestones)
  const [follow, setFollow] = useState(false)

  useEffect(() => {
    setFollow(window.localStorage.getItem(FOLLOW_KEY) === "1")
  }, [])

  const drifted = playingIndex !== null && playingIndex !== currentIndex
  const playing = playingIndex === null ? null : milestones[playingIndex]

  // Auto-follow never interrupts typing — switching mid-sentence would move the
  // caret into a different note
  useEffect(() => {
    if (!follow || !drifted || playingIndex === null) return
    const active = document.activeElement as HTMLElement | null
    if (active?.isContentEditable) return
    onSelectMilestone(playingIndex)
  }, [follow, drifted, playingIndex, onSelectMilestone])

  function toggleFollow() {
    setFollow((prev) => {
      const next = !prev
      window.localStorage.setItem(FOLLOW_KEY, next ? "1" : "0")
      return next
    })
  }

  if (!drifted || !playing) {
    return (
      <button
        type="button"
        onClick={toggleFollow}
        className={`text-xs text-default-400 underline-offset-2 hover:underline ${className}`}
        title="Automatically switch notes when the video moves into another section"
      >
        {follow ? "Following video ✓" : "Follow video"}
      </button>
    )
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-lg border border-warning-200 bg-warning-50 px-3 py-1.5 text-xs text-warning-700 dark:border-warning-800 dark:bg-warning-900/20 dark:text-warning-300 ${className}`}
    >
      <span>
        Video is in <strong>{playing.title}</strong> — notes are saving to milestone{" "}
        {currentIndex + 1}
      </span>
      <Button
        size="sm"
        variant="flat"
        color="warning"
        className="h-6 min-w-0 px-2"
        endContent={<ArrowRight size={12} />}
        onPress={() => onSelectMilestone(playingIndex)}
      >
        Switch notes there
      </Button>
      <button
        type="button"
        onClick={toggleFollow}
        className="underline-offset-2 hover:underline"
        title="Automatically switch notes when the video moves into another section"
      >
        {follow ? "Following ✓" : "Always follow"}
      </button>
    </div>
  )
}
