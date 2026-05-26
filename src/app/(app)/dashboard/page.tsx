"use client"

import Link from "next/link"
import { AnimatedDots } from "@/components/AnimatedDots"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Avatar, Button, Card, CardBody, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Image, Input, Progress } from "@heroui/react"
import { api } from "@/trpc/react"
import { signOut, useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"

dayjs.extend(relativeTime)

const STATUS_COLOR = {
  PENDING: "default",
  GENERATING: "warning",
  READY: "success",
  FAILED: "danger",
} as const

const STATUS_LABEL = {
  PENDING: "Queued",
  GENERATING: "Generating...",
  READY: "Ready",
  FAILED: "Failed",
}

type Course = {
  id: string
  title: string
  thumbnail: string
  status: string
  videoId: string
  retryCount: number
  topicId: string | null
  milestonesCount: number
  topic: { id: string; name: string } | null
  createdAt: Date
  progress: { completedMilestones: string[] }[]
}

function TopicLabel({ course, onUpdated }: { course: Course; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false)
  const [customValue, setCustomValue] = useState("")

  const { data: suggestData, isFetching: loadingSuggestions } = api.course.suggestTopics.useQuery(
    { id: course.id },
    { enabled: editing, staleTime: 0, retry: 1 },
  )

  const updateTopic = api.course.updateTopic.useMutation({
    onSuccess: () => { onUpdated(); setEditing(false) },
  })

  function saveById(topicId: string) {
    updateTopic.mutate({ id: course.id, topicId })
  }

  function saveByName(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    updateTopic.mutate({ id: course.id, topicName: trimmed })
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 py-1" onClick={(e) => { e.stopPropagation(); e.preventDefault() }}>
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => { e.preventDefault(); saveByName(customValue) }}
        >
          <Input
            autoFocus
            size="sm"
            value={customValue}
            onValueChange={setCustomValue}
            placeholder="Or type a custom topic…"
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          />
          <Button
            size="sm"
            type="submit"
            color="primary"
            isLoading={updateTopic.isPending}
            isDisabled={!customValue.trim()}
            isIconOnly
            className="shrink-0"
          >
            ✓
          </Button>
          <Button
            size="sm"
            variant="light"
            isIconOnly
            className="shrink-0"
            onPress={() => setEditing(false)}
          >
            ✕
          </Button>
        </form>

        <div className="flex flex-wrap gap-1">
          {loadingSuggestions ? (
            <span className="text-xs text-default-400">Getting suggestions<AnimatedDots /></span>
          ) : (
            <>
              {(suggestData?.existing ?? []).length > 0 && (
                <>
                  <span className="w-full text-xs text-default-400">Suggested from your topics:</span>
                  {suggestData!.existing.map((s) => (
                    <button
                      key={s.id}
                      className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                      onClick={() => saveById(s.id)}
                    >
                      {s.name}
                    </button>
                  ))}
                </>
              )}
              {suggestData?.newSuggestion && (
                <>
                  <span className="w-full text-xs text-default-400 mt-1">New topic suggestion:</span>
                  <button
                    className="rounded-full border border-dashed border-primary/50 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    onClick={() => saveByName(suggestData.newSuggestion!)}
                  >
                    + {suggestData.newSuggestion}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return course.topic ? (
    <button
      className="flex items-center gap-1 group w-fit"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setEditing(true) }}
      title="Change topic"
    >
      <span className="rounded-full bg-default-100 px-2.5 py-0.5 text-xs font-medium text-default-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        {course.topic.name}
      </span>
      <span className="text-xs text-default-400 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
    </button>
  ) : (
    <button
      className="flex items-center gap-1 rounded-full border border-dashed border-default-300 px-2.5 py-0.5 text-xs text-default-400 hover:border-primary hover:text-primary transition-colors w-fit"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setEditing(true) }}
    >
      + Add topic
    </button>
  )
}

function CourseCard({
  course,
  retryCourse,
  deleteCourse,
  onUpdated,
}: {
  course: Course
  retryCourse: ReturnType<typeof api.course.retry.useMutation>
  deleteCourse: ReturnType<typeof api.course.delete.useMutation>
  onUpdated: () => void
}) {
  const milestoneCount = course.milestonesCount
  const completedCount = course.progress[0]?.completedMilestones?.length ?? 0
  const pct = milestoneCount > 0 ? Math.round((completedCount / milestoneCount) * 100) : 0
  const isReady = course.status === "READY"

  return (
    <Card className={`overflow-hidden ${!isReady ? "cursor-not-allowed" : ""}`}>
      <CardBody className="gap-3 p-0">
        {/* Only this area navigates — topic/action area below is non-navigable */}
        <Link
          href={`/courses/${course.id}`}
          className={`block ${!isReady ? "pointer-events-none" : ""}`}
          tabIndex={isReady ? 0 : -1}
        >
          <Image
            src={course.thumbnail}
            alt={course.title || "Course thumbnail"}
            className="h-36 w-full object-cover"
            removeWrapper
          />
        </Link>
        <div className="px-4 pb-4">
          <Link
            href={`/courses/${course.id}`}
            className={`block ${!isReady ? "pointer-events-none" : ""}`}
            tabIndex={-1}
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-sm font-semibold hover:text-primary transition-colors">
                {course.title || (
                  <span className="inline-flex items-baseline">
                    Generating title<AnimatedDots />
                  </span>
                )}
              </h3>
              <Chip
                size="sm"
                color={STATUS_COLOR[course.status as keyof typeof STATUS_COLOR]}
                variant="flat"
                className="shrink-0"
              >
                {STATUS_LABEL[course.status as keyof typeof STATUS_LABEL]}
              </Chip>
            </div>
          </Link>

          {isReady && <TopicLabel course={course} onUpdated={onUpdated} />}

          {isReady && milestoneCount > 0 && (
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-xs text-default-500">
                <span>{completedCount}/{milestoneCount} milestones</span>
                <span>{pct}%</span>
              </div>
              <Progress value={pct} size="sm" color="primary" />
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-default-400">{dayjs(course.createdAt).fromNow()}</p>
            {!isReady && (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                {(course.status === "FAILED" || course.status === "PENDING") && (
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    isDisabled={course.retryCount >= 3}
                    isLoading={retryCourse.isPending && retryCourse.variables?.id === course.id}
                    onPress={() => retryCourse.mutate({ id: course.id })}
                    title={course.retryCount >= 3 ? "Max retries reached" : `${3 - course.retryCount} retries left`}
                  >
                    Retry {course.retryCount > 0 && `(${3 - course.retryCount} left)`}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  isLoading={deleteCourse.isPending && deleteCourse.variables?.id === course.id}
                  onPress={() => deleteCourse.mutate({ id: course.id })}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: courses, isLoading, refetch } = api.course.list.useQuery()
  const { data: reviewCount = 0 } = api.review.getCount.useQuery()
  const { data: streak } = api.progress.getStreak.useQuery()

  const retryCourse = api.course.retry.useMutation({ onSuccess: () => refetch() })
  const deleteCourse = api.course.delete.useMutation({ onSuccess: () => refetch() })

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED">("ALL")

  async function handleSignOut() {
    await signOut()
    router.push("/")
  }

  const filteredCourses = (courses ?? []).filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase())
    const completed = c.progress[0]?.completedMilestones?.length ?? 0
    const total = c.milestonesCount
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "NOT_STARTED" && c.status === "READY" && completed === 0) ||
      (statusFilter === "IN_PROGRESS" && c.status === "READY" && completed > 0 && completed < total) ||
      (statusFilter === "COMPLETED" && c.status === "READY" && total > 0 && completed >= total)
    return matchesSearch && matchesStatus
  })

  // Group by topic name, "Uncategorised" for courses without one
  const grouped = filteredCourses.reduce<Record<string, Course[]>>((acc, course) => {
    const key = course.topic?.name ?? "Uncategorised"
    acc[key] = [...(acc[key] ?? []), course as Course]
    return acc
  }, {})

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    if (a === "Uncategorised") return 1
    if (b === "Uncategorised") return -1
    return a.localeCompare(b)
  })

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between border-b border-divider px-6 py-4">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          VideoCourse
        </Link>
        <div className="flex items-center gap-3">
          {(streak?.currentStreak ?? 0) > 0 && (
            <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
              streak?.studiedToday
                ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                : "bg-default-100 text-default-400"
            }`}>
              🔥 {streak?.currentStreak}
            </div>
          )}
          <Button as={Link} href="/review" size="sm" variant="flat" color={reviewCount > 0 ? "warning" : "default"} className="gap-1.5">
            📌 Review
            {reviewCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-white">
                {reviewCount}
              </span>
            )}
          </Button>
          <ThemeToggle />
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                as="button"
                size="sm"
                src={session?.user.image ?? undefined}
                name={session?.user.name ?? undefined}
                className="cursor-pointer transition-opacity hover:opacity-80"
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="User menu">
              <DropdownItem key="profile" isReadOnly className="gap-2 opacity-100" textValue={session?.user.name ?? ""}>
                <p className="text-xs font-semibold">{session?.user.name}</p>
                <p className="text-xs text-default-400">{session?.user.email}</p>
              </DropdownItem>
              <DropdownItem key="signout" color="danger" onPress={handleSignOut}>
                Sign out
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Courses</h1>
            <p className="text-sm text-default-500">You can create up to 5 courses per day</p>
          </div>
          <Button as={Link} href="/courses/new" color="primary">
            + New Course
          </Button>
        </div>

        {/* Search + filter bar */}
        {!isLoading && (courses?.length ?? 0) > 0 && (
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Search courses…"
              value={search}
              onValueChange={setSearch}
              size="sm"
              className="sm:max-w-xs"
              startContent={
                <svg className="size-4 shrink-0 text-default-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              }
              isClearable
              onClear={() => setSearch("")}
            />
            <div className="flex gap-2">
              {(["ALL", "NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const).map((s) => (
                <Chip
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "solid" : "flat"}
                  color={statusFilter === s ? "primary" : "default"}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "ALL" ? "All" : s === "NOT_STARTED" ? "Not started" : s === "IN_PROGRESS" ? "In progress" : "Completed"}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardBody className="gap-3 p-4">
                  <div className="h-36 rounded-lg bg-default-200" />
                  <div className="h-4 w-3/4 rounded bg-default-200" />
                  <div className="h-3 w-1/2 rounded bg-default-200" />
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && courses?.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-divider py-20 text-center">
            <div className="text-5xl">🎬</div>
            <h2 className="text-lg font-semibold">No courses yet</h2>
            <p className="text-sm text-default-500">Paste a YouTube URL to generate your first course</p>
            <Button as={Link} href="/courses/new" color="primary">
              Create your first course
            </Button>
          </div>
        )}

        {!isLoading && (courses?.length ?? 0) > 0 && filteredCourses.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-divider py-16 text-center">
            <div className="text-4xl">🔍</div>
            <p className="text-sm text-default-500">No courses match your search.</p>
            <Button size="sm" variant="flat" onPress={() => { setSearch(""); setStatusFilter("ALL" as const) }}>
              Clear filters
            </Button>
          </div>
        )}

        {!isLoading && courses && courses.length > 0 && filteredCourses.length > 0 && (
          <div className="flex flex-col gap-10">
            {sortedGroups.map(([topicName, topicCourses]) => (
              <section key={topicName}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-base font-semibold">{topicName}</h2>
                  <span className="rounded-full bg-default-100 px-2 py-0.5 text-xs text-default-500">
                    {topicCourses.length}
                  </span>
                  <div className="h-px flex-1 bg-divider" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {topicCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      retryCourse={retryCourse}
                      deleteCourse={deleteCourse}
                      onUpdated={refetch}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
