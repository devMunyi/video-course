const MAX_CHARS = 25000
const SUPADATA_API = "https://api.supadata.ai/v1/youtube/transcript"

interface SupadataSegment {
  text: string
  offset: number
  duration: number
  lang: string
}

interface SupadataResponse {
  lang: string
  availableLangs: string[]
  content: SupadataSegment[]
}

export async function fetchTranscript(videoId: string): Promise<string> {
  const apiKey = process.env.SUPADATA_API_KEY
  if (!apiKey) throw new Error("SUPADATA_API_KEY is not configured")

  const url = `${SUPADATA_API}?videoId=${encodeURIComponent(videoId)}&lang=en`
  const res = await fetch(url, { headers: { "x-api-key": apiKey } })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(
      `Transcript unavailable for this video (${res.status}${body ? `: ${body}` : ""})`,
    )
  }

  const data: SupadataResponse = await res.json()
  const segments = data.content ?? []

  const lines: string[] = []
  let total = 0

  for (const seg of segments) {
    const minutes = Math.floor(seg.offset / 60000)
    const seconds = Math.floor((seg.offset % 60000) / 1000)
    const timestamp = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    const line = `[${timestamp}] ${seg.text}`
    lines.push(line)
    total += line.length
    if (total >= MAX_CHARS) break
  }

  return lines.join("\n")
}
