"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button, Chip } from "@heroui/react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import RichTextEditor from "@/components/editor/RichTextEditor"
import VideoEmbed from "./VideoEmbed"
import { useVideoPlayer } from "./video-player-context"

type Milestone = {
  id: string
  title: string
  description: string
  timestamp_start: string
  timestamp_end: string
  key_concepts: string[]
}

type Props = {
  videoId: string
  milestone: Milestone
  index: number
  total: number
  note: string
  onNoteChange: (html: string) => void
  onPrev: () => void
  onNext: () => void
  onExit: () => void
  status: string
}

const SPLIT_KEY = "study-mode-split"
const MIN_PCT = 30
const MAX_PCT = 70

export default function StudyMode({
  videoId,
  milestone,
  index,
  total,
  note,
  onNoteChange,
  onPrev,
  onNext,
  onExit,
  status,
}: Props) {
  const { getCurrentTime, seekTo } = useVideoPlayer()
  const containerRef = useRef<HTMLDivElement>(null)
  const [splitPct, setSplitPct] = useState(50)
  const [dragging, setDragging] = useState(false)
  /** Notes take the whole width; the video keeps playing behind (audio included). */
  const [notesFull, setNotesFull] = useState(false)

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(SPLIT_KEY))
    if (stored >= MIN_PCT && stored <= MAX_PCT) setSplitPct(stored)
  }, [])

  // Lock page scroll — study mode owns the viewport
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Esc exits, unless it's dismissing something layered on top (drawing canvas, popovers)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      if (document.querySelector("[data-drawing-open='true'], [role='dialog']")) return
      onExit()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onExit])

  const onDrag = useCallback((clientX: number) => {
    const box = containerRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return
    const pct = ((clientX - box.left) / box.width) * 100
    const clamped = Math.min(MAX_PCT, Math.max(MIN_PCT, pct))
    setSplitPct(clamped)
    window.localStorage.setItem(SPLIT_KEY, String(Math.round(clamped)))
  }, [])

  useEffect(() => {
    if (!dragging) return
    function onMove(e: MouseEvent) {
      e.preventDefault()
      onDrag(e.clientX)
    }
    function onUp() {
      setDragging(false)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [dragging, onDrag])

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-divider px-4 py-2">
        <Chip size="sm" variant="flat" color="primary">
          {index + 1} / {total}
        </Chip>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{milestone.title}</h2>
        <span className="hidden text-xs text-default-400 sm:inline">{status}</span>
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label="Previous milestone"
          isDisabled={index === 0}
          onPress={onPrev}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label="Next milestone"
          isDisabled={index === total - 1}
          onPress={onNext}
        >
          <ChevronRight size={16} />
        </Button>
        <Button size="sm" variant="flat" startContent={<X size={15} />} onPress={onExit}>
          Exit
        </Button>
      </div>

      {/* Panes: side by side from lg, stacked below */}
      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 flex-col lg:flex-row"
        style={{ "--split": `${splitPct}%` } as React.CSSProperties}
      >
        {/* Kept mounted while collapsed — unmounting would reload the iframe and stop playback */}
        <div
          className={`study-video-pane flex min-h-0 flex-col gap-4 overflow-y-auto p-4 ${
            notesFull ? "hidden" : ""
          }`}
        >
          <VideoEmbed
            videoId={videoId}
            startTimestamp={milestone.timestamp_start}
            variant="fill"
            sectionKey={milestone.id}
          />
          <div className="hidden lg:block">
            <p className="text-xs text-default-400">
              {milestone.timestamp_start} – {milestone.timestamp_end}
            </p>
            <p className="mt-2 text-sm text-default-500">{milestone.description}</p>
            {milestone.key_concepts.length > 0 && (
              <>
                <h3 className="mb-2 mt-4 text-sm font-semibold">💡 Key Concepts</h3>
                <ul className="flex flex-col gap-1.5">
                  {milestone.key_concepts.map((concept) => (
                    <li key={concept} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {concept}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Drag handle (desktop only) */}
        <button
          type="button"
          aria-label="Resize panes"
          className={`hidden w-1.5 shrink-0 cursor-col-resize border-x border-divider transition-colors ${
            notesFull ? "" : "lg:block"
          } ${dragging ? "bg-primary" : "bg-default-100 hover:bg-primary/40"}`}
          onMouseDown={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setSplitPct((p) => Math.max(MIN_PCT, p - 2))
            if (e.key === "ArrowRight") setSplitPct((p) => Math.min(MAX_PCT, p + 2))
          }}
        />

        <div className="flex min-h-0 flex-1 flex-col p-4 pt-0 lg:pt-4">
          <RichTextEditor
            value={note}
            onChange={onNoteChange}
            placeholder="Type as you watch… ⏱ stamps the current video time"
            getVideoTime={getCurrentTime}
            onSeek={seekTo}
            isExpanded={notesFull}
            onToggleExpand={() => setNotesFull((v) => !v)}
            fill
          />
        </div>
      </div>
    </div>
  )
}
