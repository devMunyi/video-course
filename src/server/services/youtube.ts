import { YoutubeTranscript } from "youtube-transcript"

const MAX_CHARS = 25000

export async function fetchTranscript(videoId: string): Promise<string> {
  const items = await YoutubeTranscript.fetchTranscript(videoId)

  const lines: string[] = []
  let total = 0

  for (const item of items) {
    const minutes = Math.floor(item.offset / 60000)
    const seconds = Math.floor((item.offset % 60000) / 1000)
    const timestamp = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    const line = `[${timestamp}] ${item.text}`
    lines.push(line)
    total += line.length
    if (total >= MAX_CHARS) break
  }

  return lines.join("\n")
}
