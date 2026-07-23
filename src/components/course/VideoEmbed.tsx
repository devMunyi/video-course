"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@heroui/react"
import { useOptionalVideoPlayer } from "./video-player-context"

type Props = {
  videoId: string
  startTimestamp?: string
  /** Study mode fills its pane instead of sitting in the article flow. */
  variant?: "inline" | "fill"
  /** Milestone id — a change means "jump to this section's start". */
  sectionKey?: string
}

type YTPlayer = {
  getCurrentTime: () => number
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  destroy: () => void
}

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    options: {
      videoId: string
      playerVars: Record<string, string | number>
      events: { onReady: () => void }
    },
  ) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YTNamespace> | null = null

function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error("YouTube API loaded without Player"))
    }
    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    script.async = true
    script.onerror = () => reject(new Error("Could not load the YouTube player"))
    document.head.appendChild(script)
  })
  return apiPromise
}

export function timestampToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number)
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
  return 0
}

export default function VideoEmbed({
  videoId,
  startTimestamp,
  variant = "inline",
  sectionKey,
}: Props) {
  const [visible, setVisible] = useState(true)
  const [failed, setFailed] = useState(false)
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const player = useOptionalVideoPlayer()
  const sectionStart = startTimestamp ? timestampToSeconds(startTimestamp) : 0
  // Read inside the player effect without making it a dependency: a new section
  // seeks the live player rather than tearing the iframe down
  const sectionStartRef = useRef(sectionStart)
  sectionStartRef.current = sectionStart
  const sectionKeyRef = useRef(sectionKey)
  sectionKeyRef.current = sectionKey

  // Jump to the section start when the milestone changes, but not on a
  // re-mount caused purely by switching layouts
  const lastSectionRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (lastSectionRef.current === undefined) {
      lastSectionRef.current = sectionKey
      return
    }
    if (lastSectionRef.current === sectionKey) return
    lastSectionRef.current = sectionKey
    if (player) player.lastTimeRef.current = null
    playerRef.current?.seekTo(sectionStart, true)
  }, [sectionKey, sectionStart, player])

  useEffect(() => {
    if (!visible) return
    const mount = mountRef.current
    if (!mount) return

    let cancelled = false
    let saveTimer: ReturnType<typeof setInterval> | null = null

    // Resume where the previous mount left off. On a fresh page load there is no
    // in-memory position, so fall back to the one saved before the reload —
    // but only if it belongs to the milestone being shown.
    const inMemory = player?.lastTimeRef.current ?? null
    const stored = inMemory === null ? player?.restore() : null
    const resumeAt =
      inMemory ?? (stored && stored.milestoneId === sectionKeyRef.current ? stored.seconds : null)
    const startAt =
      resumeAt !== null && resumeAt > 0 ? Math.floor(resumeAt) : sectionStartRef.current

    void loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return
        const host = document.createElement("div")
        host.className = "h-full w-full"
        mountRef.current.replaceChildren(host)

        const instance = new YT.Player(host, {
          videoId,
          playerVars: {
            start: startAt,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              if (cancelled) return
              player?.register({
                getCurrentTime: () => instance.getCurrentTime(),
                seekTo: (seconds) => instance.seekTo(seconds, true),
              })
            },
          },
        })
        playerRef.current = instance

        // Cheap heartbeat so a remount — or a reload — can resume even if it
        // happens abruptly (crash, closed tab, navigation away)
        saveTimer = setInterval(() => {
          if (!player) return
          const t = instance.getCurrentTime?.()
          if (typeof t !== "number" || t <= 0) return
          player.lastTimeRef.current = t
          if (sectionKeyRef.current) player.persist(sectionKeyRef.current, t)
        }, 1000)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      if (saveTimer) clearInterval(saveTimer)
      const instance = playerRef.current
      if (instance && player) {
        const t = instance.getCurrentTime?.()
        if (typeof t === "number" && t > 0) {
          player.lastTimeRef.current = t
          if (sectionKeyRef.current) player.persist(sectionKeyRef.current, t)
        }
      }
      player?.register(null)
      instance?.destroy?.()
      playerRef.current = null
      mount.replaceChildren()
    }
  }, [videoId, visible, player])

  if (failed) {
    // Fall back to a plain embed if the API script is blocked
    return (
      <div className={variant === "fill" ? "h-full w-full" : "mb-6 aspect-video w-full"}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?start=${sectionStart}&rel=0`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full rounded-xl"
        />
      </div>
    )
  }

  if (variant === "fill") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow">
        <div ref={mountRef} className="h-full w-full" />
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-default-500">VIDEO</span>
        <Button size="sm" variant="light" onPress={() => setVisible(!visible)}>
          {visible ? "Hide" : "Show"} video
        </Button>
      </div>
      {visible && (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow">
          <div ref={mountRef} className="h-full w-full" />
        </div>
      )}
    </div>
  )
}
