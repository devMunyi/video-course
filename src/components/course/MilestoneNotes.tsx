"use client"

import { Button } from "@heroui/react"
import { Columns2 } from "lucide-react"
import RichTextEditor from "@/components/editor/RichTextEditor"
import { useOptionalVideoPlayer } from "./video-player-context"

type Props = {
  /** Note HTML. Autosave lives in useNoteDraft, one level up. */
  value: string
  onChange: (html: string) => void
  status: string
  onOpenStudyMode?: () => void
}

export default function MilestoneNotes({ value, onChange, status, onOpenStudyMode }: Props) {
  const player = useOptionalVideoPlayer()

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <span>📝</span> My Notes
        </h3>
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
