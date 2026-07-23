"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Textarea } from "@heroui/react"

type Props = {
  milestoneId: string
  savedNote: string
  onSave: (milestoneId: string, note: string) => void
  isSaving: boolean
}

export default function MilestoneNotes({ milestoneId, savedNote, onSave, isSaving }: Props) {
  const [value, setValue] = useState(savedNote)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedIdRef = useRef(milestoneId)
  // Set once the user types; from then on the local value wins over server echoes
  const hasLocalEditRef = useRef(false)
  const pendingRef = useRef<{ milestoneId: string; note: string } | null>(null)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const isDirty = value !== savedNote

  // Stable: reads only refs
  const flush = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending) onSaveRef.current(pending.milestoneId, pending.note)
  }, [])

  useEffect(() => {
    // Switching milestones: save whatever is still pending, then load the new note
    if (loadedIdRef.current !== milestoneId) {
      flush()
      loadedIdRef.current = milestoneId
      hasLocalEditRef.current = false
      setValue(savedNote)
      return
    }
    // Same milestone: only adopt the server value before the user has typed,
    // otherwise a save round-trip would overwrite the textarea and jump the caret
    if (!hasLocalEditRef.current) setValue(savedNote)
  }, [milestoneId, savedNote, flush])

  function handleChange(val: string) {
    hasLocalEditRef.current = true
    setValue(val)
    pendingRef.current = { milestoneId, note: val }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      const pending = pendingRef.current
      pendingRef.current = null
      if (pending) onSaveRef.current(pending.milestoneId, pending.note)
    }, 800)
  }

  // Flush pending note on unmount so nothing typed is lost
  useEffect(() => flush, [flush])

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <span>📝</span> My Notes
      </h3>
      <Textarea
        value={value}
        onValueChange={handleChange}
        placeholder="Write your notes for this milestone…"
        minRows={3}
        maxRows={10}
        classNames={{
          input: "text-sm",
        }}
      />
      <p className="mt-1 text-right text-xs text-default-400">
        {isSaving ? "Saving…" : isDirty ? "Unsaved" : value ? "Saved" : ""}
      </p>
    </div>
  )
}
