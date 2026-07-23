"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { isEmptyNote, toEditorHtml } from "@/lib/note-html"

const DEBOUNCE_MS = 800

type Options = {
  milestoneId: string
  savedNote: string
  onSave: (milestoneId: string, note: string, allowClearing: boolean) => void
  isSaving: boolean
}

/**
 * Debounced note autosave, owned above the editor so the draft survives layout
 * switches (study mode) and only one debounce timer is ever in flight.
 */
export function useNoteDraft({ milestoneId, savedNote, onSave, isSaving }: Options) {
  const [value, setValue] = useState(() => toEditorHtml(savedNote))
  const [isDirty, setIsDirty] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<{
    milestoneId: string
    note: string
    allowClearing: boolean
  } | null>(null)
  const loadedIdRef = useRef(milestoneId)
  /** Set once the user types; from then on the local value wins over server echoes. */
  const hasLocalEditRef = useRef(false)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const flush = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const pending = pendingRef.current
    pendingRef.current = null
    setIsDirty(false)
    if (pending) onSaveRef.current(pending.milestoneId, pending.note, pending.allowClearing)
  }, [])

  useEffect(() => {
    // Switching milestones: save whatever is still pending, then load the new note
    if (loadedIdRef.current !== milestoneId) {
      flush()
      loadedIdRef.current = milestoneId
      hasLocalEditRef.current = false
      setValue(toEditorHtml(savedNote))
      return
    }
    // Same milestone: only adopt the server value before the user has typed.
    // Otherwise a save round-trip would overwrite the note and jump the caret.
    if (!hasLocalEditRef.current) setValue(toEditorHtml(savedNote))
  }, [milestoneId, savedNote, flush])

  const onChange = useCallback((html: string) => {
    // Emptying a note is only accepted while the editor genuinely has focus.
    // Without this, any stray empty update would erase real notes; the server
    // enforces the same rule via allowClearingNotes.
    const active = document.activeElement as HTMLElement | null
    const allowClearing = active?.isContentEditable === true

    hasLocalEditRef.current = true
    setValue(html)
    pendingRef.current = { milestoneId: loadedIdRef.current, note: html, allowClearing }
    setIsDirty(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      const pending = pendingRef.current
      pendingRef.current = null
      setIsDirty(false)
      if (pending) onSaveRef.current(pending.milestoneId, pending.note, pending.allowClearing)
    }, DEBOUNCE_MS)
  }, [])

  // Flush the pending note on unmount so nothing typed is lost
  useEffect(() => flush, [flush])

  // Save before the tab closes
  useEffect(() => {
    function onBeforeUnload() {
      flush()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [flush])

  const status = isDirty ? "Unsaved" : isSaving ? "Saving…" : isEmptyNote(value) ? "" : "Saved"

  return { value, onChange, status, flush }
}
