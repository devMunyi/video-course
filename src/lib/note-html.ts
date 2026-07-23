/**
 * Notes are stored as HTML strings in UserProgress.milestoneNotes.
 * Older notes were saved as plain text from a <textarea>, so anything that
 * doesn't look like HTML gets converted on read.
 */

const HTML_TAG = /<(p|h[1-6]|ul|ol|li|blockquote|pre|div|img|table|excalidraw-drawing|br)\b/i

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Convert a legacy plain-text note into HTML paragraphs. Already-HTML notes pass through. */
export function toEditorHtml(note: string): string {
  if (!note) return ""
  if (HTML_TAG.test(note)) return note
  return note
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("")
}

/**
 * True when the note has no text and no drawings/images.
 * Tiptap serialises an untouched editor as "<p></p>", which must not count as a note.
 */
export function isEmptyNote(note: string | undefined | null): boolean {
  if (!note) return true
  if (/<(img|excalidraw-drawing|hr|table)\b/i.test(note)) return false
  return (
    note
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length === 0
  )
}

/** Plain-text preview of a note, for search/summaries. */
export function noteToPlainText(note: string): string {
  return note
    .replace(/<\/(p|h[1-6]|li|blockquote|pre|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<excalidraw-drawing\b[^>]*>(<\/excalidraw-drawing>)?/gi, "[drawing]\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
