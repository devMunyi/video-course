"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { Button, Chip, Spinner } from "@heroui/react"
import { ArrowLeft, Printer } from "lucide-react"
import RichTextEditor from "@/components/editor/RichTextEditor"
import { ThemeToggle } from "@/components/ThemeToggle"
import type { CourseContent } from "@/server/services/claude"
import { isEmptyNote, toEditorHtml } from "@/lib/note-html"
import { api } from "@/trpc/react"

export default function CourseNotesPage() {
  const { id } = useParams<{ id: string }>()
  // Reuses the course query the course page already populated — no extra round trip
  const { data: course, isLoading } = api.course.getById.useQuery({ id })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-default-500">Course not found.</p>
        <Button as={Link} href="/dashboard" color="primary">
          Back to dashboard
        </Button>
      </div>
    )
  }

  const content = course.content as unknown as CourseContent | undefined
  const milestones = content?.milestones ?? []
  const notes = (course.progress[0]?.milestoneNotes ?? {}) as Record<string, string>
  const written = milestones
    .map((m, index) => ({ milestone: m, index, note: notes[m.id] ?? "" }))
    .filter((entry) => !isEmptyNote(entry.note))

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-10 flex items-center gap-3 border-b border-divider bg-background/80 px-6 py-3 backdrop-blur print:hidden">
        <Button as={Link} href={`/courses/${id}`} size="sm" variant="light" isIconOnly aria-label="Back to course">
          <ArrowLeft size={16} />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{course.title}</h1>
        <span className="text-xs text-default-400">
          {written.length} of {milestones.length} sections
        </span>
        <Button
          size="sm"
          variant="flat"
          startContent={<Printer size={15} />}
          onPress={() => window.print()}
        >
          Print / PDF
        </Button>
        <ThemeToggle />
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8 hidden print:block">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-sm text-default-500">Course notes</p>
        </div>

        {written.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <div className="text-4xl">📝</div>
            <p className="text-default-500">No notes yet.</p>
            <Button as={Link} href={`/courses/${id}`} color="primary" size="sm">
              Start taking notes
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {written.map(({ milestone, index, note }) => (
              <section key={milestone.id} className="break-inside-avoid">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Chip size="sm" variant="flat" color="primary">
                    {index + 1}
                  </Chip>
                  <h2 className="text-lg font-bold">{milestone.title}</h2>
                  <span className="text-xs text-default-400">
                    {milestone.timestamp_start} – {milestone.timestamp_end}
                  </span>
                  <Button
                    as={Link}
                    href={`/courses/${id}`}
                    size="sm"
                    variant="light"
                    className="ml-auto h-6 min-w-0 px-2 text-xs print:hidden"
                  >
                    Edit
                  </Button>
                </div>
                <div className="rounded-xl border border-divider bg-content1 px-4 py-3 print:border-0 print:bg-transparent print:px-0">
                  <RichTextEditor
                    value={toEditorHtml(note)}
                    onChange={() => {}}
                    editable={false}
                  />
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
