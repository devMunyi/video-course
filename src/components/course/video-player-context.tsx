"use client"

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react"
import { loadPosition, savePosition } from "@/lib/playback-store"

type Controls = {
  getCurrentTime: () => number | null
  seekTo: (seconds: number) => void
}

type VideoPlayerContextValue = {
  /** Registered by whichever <VideoEmbed> is currently mounted. */
  register: (controls: Controls | null) => void
  /**
   * Last known playback position, kept outside React state so the embed can be
   * unmounted and remounted (layout switches, milestone changes) and resume where
   * it left off — reparenting an iframe in the DOM always reloads it.
   */
  lastTimeRef: { current: number | null }
  getCurrentTime: () => number | null
  seekTo: (seconds: number) => void
  /** Records the position so a page reload can resume from it. */
  persist: (milestoneId: string, seconds: number) => void
  /** Stored position for this course, or null if there isn't a usable one. */
  restore: () => { milestoneId: string; seconds: number } | null
}

const VideoPlayerContext = createContext<VideoPlayerContextValue | null>(null)

export function VideoPlayerProvider({
  courseId,
  children,
}: {
  courseId: string
  children: ReactNode
}) {
  const controlsRef = useRef<Controls | null>(null)
  const lastTimeRef = useRef<number | null>(null)

  const register = useCallback((controls: Controls | null) => {
    controlsRef.current = controls
  }, [])

  const getCurrentTime = useCallback(
    () => controlsRef.current?.getCurrentTime() ?? lastTimeRef.current,
    [],
  )

  const seekTo = useCallback((seconds: number) => {
    lastTimeRef.current = seconds
    controlsRef.current?.seekTo(seconds)
  }, [])

  const persist = useCallback(
    (milestoneId: string, seconds: number) => savePosition(courseId, milestoneId, seconds),
    [courseId],
  )

  const restore = useCallback(() => {
    const stored = loadPosition(courseId)
    return stored ? { milestoneId: stored.milestoneId, seconds: stored.seconds } : null
  }, [courseId])

  const value = useMemo(
    () => ({ register, lastTimeRef, getCurrentTime, seekTo, persist, restore }),
    [register, getCurrentTime, seekTo, persist, restore],
  )

  return <VideoPlayerContext.Provider value={value}>{children}</VideoPlayerContext.Provider>
}

export function useVideoPlayer() {
  const ctx = useContext(VideoPlayerContext)
  if (!ctx) throw new Error("useVideoPlayer must be used inside <VideoPlayerProvider>")
  return ctx
}

/** Same as useVideoPlayer, but safe outside the provider (e.g. the public share page). */
export function useOptionalVideoPlayer() {
  return useContext(VideoPlayerContext)
}

export function formatTimestamp(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes)
  return `${hours > 0 ? `${hours}:` : ""}${mm}:${String(seconds).padStart(2, "0")}`
}
