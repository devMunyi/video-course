"use client"

import { Button } from "@heroui/react"
import { Columns2 } from "lucide-react"
import RichTextEditor from "@/components/editor/RichTextEditor"
import SectionDriftNotice from "./SectionDriftNotice"
import { useOptionalVideoPlayer } from "./video-player-context"

type SectionLike = { id: string; title: string; timestamp_start: string; timestamp_end: string }

type Props = {
  /** Note HTML. Autosave lives in useNoteDraft, one level up. */
  value: string
  onChange: (html: string) => void
  status: string
  onOpenStudyMode?: () => void
  /** Which milestone these notes belong to, spelled out to avoid mixing sections up. */
  milestones: SectionLike[]
  currentIndex: number
  onSelectMilestone: (index: number) => void
}

export default function MilestoneNotes({
  value,
  onChange,
  status,
  onOpenStudyMode,
  milestones,
  currentIndex,
  onSelectMilestone,
}: Props) {
  const player = useOptionalVideoPlayer()
  const current = milestones[currentIndex]

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <span>📝</span> My Notes
        </h3>
        {current && (
          <span className="truncate text-xs text-default-400">
            Milestone {currentIndex + 1} · {current.timestamp_start} – {current.timestamp_end}
          </span>
        )}
        {onOpenStudyMode && (
          <Button
            size="sm"
            variant="flat"
            color="primary"
            className="ml-auto"
            startContent={<Columns2 size={15} />}
            onPress={onOpenStudyMode}
          >
            Study mode
          </Button>
        )}
      </div>
      <SectionDriftNotice
        milestones={milestones}
        currentIndex={currentIndex}
        onSelectMilestone={onSelectMilestone}
        className="mb-2"
      />
      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder="Write your notes for this milestone…"
        getVideoTime={player?.getCurrentTime}
        onSeek={player?.seekTo}
      />
      <p className="mt-1 text-right text-xs text-default-400">{status}</p>
    </div>
  )
}
