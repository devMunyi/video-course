/**
 * Where the learner left off, per course. Kept in localStorage rather than the
 * database: it changes every couple of seconds while watching, which is far too
 * chatty for a mutation, and "where my video was" is reasonably device-local.
 */

export type PlaybackPosition = {
  milestoneId: string
  seconds: number
  updatedAt: number
}

/** Positions older than this are ignored — resuming a month-old session is more confusing than useful. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

function key(courseId: string) {
  return `playback:${courseId}`
}

export function loadPosition(courseId: string): PlaybackPosition | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key(courseId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PlaybackPosition
    if (typeof parsed?.seconds !== "number" || typeof parsed?.milestoneId !== "string") return null
    if (Date.now() - (parsed.updatedAt ?? 0) > MAX_AGE_MS) return null
    return parsed
  } catch {
    return null
  }
}

export function savePosition(courseId: string, milestoneId: string, seconds: number) {
  if (typeof window === "undefined" || !courseId || !milestoneId) return
  if (!Number.isFinite(seconds) || seconds <= 0) return
  try {
    const value: PlaybackPosition = { milestoneId, seconds, updatedAt: Date.now() }
    window.localStorage.setItem(key(courseId), JSON.stringify(value))
  } catch {
    // Private mode or a full quota — resuming is a convenience, never a hard failure
  }
}

export function clearPosition(courseId: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(key(courseId))
  } catch {
    // ignore
  }
}
