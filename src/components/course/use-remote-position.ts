"use client"

import { useCallback, useEffect, useRef } from "react"
import { api } from "@/trpc/react"

/** Only write when the position moved this far, so a paused tab writes nothing. */
const MIN_DELTA_SEC = 20
/** Slow heartbeat; localStorage already covers second-by-second on this device. */
const HEARTBEAT_MS = 60_000

type Options = {
  courseId: string
  milestoneId: string | undefined
  getCurrentTime: (() => number | null) | undefined
}

/**
 * Mirrors the playback position to the database so another device can resume.
 *
 * Kept deliberately quiet: the database is on a free Neon plan, so this writes
 * at most once a minute while playing, plus once when the tab is hidden or the
 * section changes, and skips writes when the position barely moved. The
 * authoritative per-device position stays in localStorage.
 */
export function useRemotePositionSync({ courseId, milestoneId, getCurrentTime }: Options) {
  const save = api.progress.savePosition.useMutation({
    // No query invalidation: resuming reads this on the next page load, and
    // refetching the course here would cost another round trip for nothing
    onError: () => {
      // A lost position is a convenience, never worth surfacing an error for
    },
  })

  const milestoneRef = useRef(milestoneId)
  milestoneRef.current = milestoneId
  const getTimeRef = useRef(getCurrentTime)
  getTimeRef.current = getCurrentTime
  const saveRef = useRef(save)
  saveRef.current = save
  const lastSentRef = useRef<{ milestoneId: string; seconds: number } | null>(null)

  const flush = useCallback((force = false) => {
    const milestone = milestoneRef.current
    const seconds = getTimeRef.current?.()
    if (!milestone || typeof seconds !== "number" || seconds <= 0) return

    const last = lastSentRef.current
    const sameSection = last?.milestoneId === milestone
    if (!force && sameSection && Math.abs((last?.seconds ?? 0) - seconds) < MIN_DELTA_SEC) return

    const rounded = Math.floor(seconds)
    lastSentRef.current = { milestoneId: milestone, seconds: rounded }
    saveRef.current.mutate({ courseId, milestoneId: milestone, seconds: rounded })
  }, [courseId])

  // Slow heartbeat while the page is open
  useEffect(() => {
    const timer = setInterval(() => flush(), HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [flush])

  // Leaving the tab is the most likely moment to switch devices
  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden") flush()
    }
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("pagehide", onHide)
    return () => {
      document.removeEventListener("visibilitychange", onHide)
      window.removeEventListener("pagehide", onHide)
    }
  }, [flush])

  // Record the new section shortly after a switch. Deliberately not on the
  // outgoing section: changing milestone also seeks the player, so reading the
  // time during the transition can capture a position that belongs to neither.
  useEffect(() => {
    if (!milestoneId) return
    const timer = setTimeout(() => flush(true), 2000)
    return () => clearTimeout(timer)
  }, [milestoneId, flush])

  // Final write when leaving the course page
  useEffect(() => {
    return () => flush(true)
  }, [flush])
}
