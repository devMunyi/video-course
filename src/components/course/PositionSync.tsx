"use client"

import { useRemotePositionSync } from "./use-remote-position"
import { useVideoPlayer } from "./video-player-context"

/**
 * Renders nothing; exists so the sync hook can sit inside <VideoPlayerProvider>,
 * which the course page itself is outside of.
 */
export default function PositionSync({
  courseId,
  milestoneId,
}: {
  courseId: string
  milestoneId: string | undefined
}) {
  const { getCurrentTime } = useVideoPlayer()
  useRemotePositionSync({ courseId, milestoneId, getCurrentTime })
  return null
}
