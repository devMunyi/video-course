"use client"

import { useState } from "react"
import { Button } from "@heroui/react"

type Props = {
  videoId: string
  startTimestamp?: string
}

function timestampToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number)
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
  return 0
}

export default function VideoEmbed({ videoId, startTimestamp }: Props) {
  const [visible, setVisible] = useState(true)
  const start = startTimestamp ? timestampToSeconds(startTimestamp) : 0

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
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?start=${start}&rel=0`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}
    </div>
  )
}
