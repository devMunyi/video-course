"use client"

type Milestone = {
  id: string
  title: string
  timestamp_start: string
  timestamp_end: string
}

type Props = {
  milestones: Milestone[]
  currentIndex: number
  completedIds: string[]
  noteIds?: string[]
  onSelect: (index: number) => void
}

export default function MilestoneSidebar({
  milestones,
  currentIndex,
  completedIds,
  noteIds = [],
  onSelect,
}: Props) {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-1">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-default-400">
        Milestones
      </p>
      {milestones.map((m, i) => {
        const isCompleted = completedIds.includes(m.id)
        const isCurrent = i === currentIndex
        const hasNote = noteIds.includes(m.id)

        return (
          <button
            type="button"
            key={m.id}
            onClick={() => onSelect(i)}
            className={`flex items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
              isCurrent ? "bg-primary/10 text-primary" : "text-default-600 hover:bg-default-100"
            }`}
          >
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isCompleted
                  ? "bg-success text-white"
                  : isCurrent
                    ? "bg-primary text-white"
                    : "bg-default-200 text-default-500"
              }`}
            >
              {isCompleted ? "✓" : i + 1}
            </span>
            <div className="min-w-0">
              <p className="line-clamp-2 text-xs font-medium leading-snug">
                {m.title}
                {hasNote && <span className="ml-1 text-default-400">📝</span>}
              </p>
              <p className="mt-0.5 text-xs text-default-400">
                {m.timestamp_start} – {m.timestamp_end}
              </p>
            </div>
          </button>
        )
      })}
    </aside>
  )
}
