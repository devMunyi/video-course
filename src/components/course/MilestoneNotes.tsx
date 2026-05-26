"use client"

import { useEffect, useRef, useState } from "react"
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
  const isDirty = value !== savedNote

  // Reset local value when switching milestones
  useEffect(() => {
    setValue(savedNote)
  }, [milestoneId, savedNote])

  function handleChange(val: string) {
    setValue(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSave(milestoneId, val)
    }, 1000)
  }

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

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
