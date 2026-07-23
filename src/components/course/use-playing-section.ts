"use client"

import { useEffect, useRef, useState } from "react"
import { timestampToSeconds } from "./VideoEmbed"
import { useOptionalVideoPlayer } from "./video-player-context"

type SectionLike = { id: string; timestamp_start: string; timestamp_end: string }

const POLL_MS = 2000

/**
 * Which milestone the video is actually playing, which drifts away from the
 * milestone on screen as soon as playback crosses a section boundary.
 *
 * Polled locally rather than pushed through context: at one tick per second a
 * context update would re-render the whole course page, editor included.
 */
export function usePlayingSection(sections: SectionLike[]): number | null {
  const player = useOptionalVideoPlayer()
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)

  // Held in a ref, not a dependency: the caller rebuilds this array on every
  // render, which would otherwise restart the interval on every keystroke.
  // Recomputing a handful of timestamps per render is far cheaper than that.
  const boundsRef = useRef<{ start: number; end: number }[]>([])
  boundsRef.current = sections.map((s, i) => {
    const start = timestampToSeconds(s.timestamp_start)
    // Prefer the next section's start: it closes gaps left by rounded end stamps
    const next = sections[i + 1]
    const end = next
      ? timestampToSeconds(next.timestamp_start)
      : timestampToSeconds(s.timestamp_end) || Number.POSITIVE_INFINITY
    return { start, end }
  })

  useEffect(() => {
    if (!player) return

    function tick() {
      const seconds = player?.getCurrentTime()
      if (typeof seconds !== "number" || seconds <= 0) return
      const index = boundsRef.current.findIndex((b) => seconds >= b.start && seconds < b.end)
      setPlayingIndex(index === -1 ? null : index)
    }

    tick()
    const timer = setInterval(tick, POLL_MS)
    return () => clearInterval(timer)
  }, [player])

  return playingIndex
}
