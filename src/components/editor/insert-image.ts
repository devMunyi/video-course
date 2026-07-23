import type { Editor } from "@tiptap/react"

/**
 * Notes are stored inline in a JSON column, so pasted screenshots are downscaled
 * and re-encoded before they become data URIs. A raw 4K chart screenshot is ~8MB;
 * this brings it to roughly 150–400KB with no visible loss at note width.
 */
const MAX_EDGE = 1600
const JPEG_QUALITY = 0.82

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Could not read image"))
    img.src = src
  })
}

export async function compressImageFile(file: File): Promise<string> {
  const dataUrl = await readAsDataUrl(file)
  // SVG and GIF lose their point when rasterised — keep them as-is
  if (file.type === "image/svg+xml" || file.type === "image/gif") return dataUrl

  const img = await loadImage(dataUrl)
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  if (scale === 1 && dataUrl.length < 400_000) return dataUrl

  const canvas = document.createElement("canvas")
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) return dataUrl
  // JPEG has no alpha, so flatten onto white rather than letting it go black
  const hasAlpha = file.type === "image/png" || file.type === "image/webp"
  if (!hasAlpha) {
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const jpeg = canvas.toDataURL("image/jpeg", JPEG_QUALITY)
  const png = hasAlpha ? canvas.toDataURL("image/png") : jpeg
  const best = png.length < jpeg.length ? png : jpeg
  return best.length < dataUrl.length ? best : dataUrl
}

export async function insertImageFiles(editor: Editor, files: File[]) {
  const images = files.filter((f) => f.type.startsWith("image/"))
  for (const file of images) {
    try {
      const src = await compressImageFile(file)
      editor.chain().focus().setImage({ src, alt: file.name }).run()
    } catch {
      // Skip unreadable files rather than losing the rest of the paste
    }
  }
}
