"use client"

import Link from "next/link"
import { Button, Card, CardBody, Chip, Image, Progress } from "@heroui/react"
import { api } from "@/trpc/react"
import { signOut, useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
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

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: courses, isLoading } = api.course.list.useQuery()

  async function handleSignOut() {
    await signOut()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between border-b border-divider px-6 py-4">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          VideoCourse
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-default-500">{session?.user.name}</span>
          <Button variant="ghost" size="sm" onPress={handleSignOut}>
            Sign out
          </Button>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Courses</h1>
            <p className="text-sm text-default-500">You can create up to 5 courses per day</p>
          </div>
          <Button as={Link} href="/courses/new" color="primary">
            + New Course
          </Button>
        </div>

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

        {!isLoading && courses && courses.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const milestoneCount =
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (course as any).content?.milestones?.length ?? 0
              const completedCount = course.progress[0]?.completedMilestones?.length ?? 0
              const pct = milestoneCount > 0 ? Math.round((completedCount / milestoneCount) * 100) : 0

              return (
                <Card
                  key={course.id}
                  isPressable={course.status === "READY"}
                  as={course.status === "READY" ? Link : undefined}
                  href={`/courses/${course.id}`}
                  className="overflow-hidden"
                >
                  <CardBody className="gap-3 p-0">
                    <Image
                      src={course.thumbnail}
                      alt={course.title || "Course thumbnail"}
                      className="h-36 w-full object-cover"
                      removeWrapper
                    />
                    <div className="px-4 pb-4">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-sm font-semibold">
                          {course.title || "Generating title..."}
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
                      {course.status === "READY" && milestoneCount > 0 && (
                        <div className="mt-2">
                          <div className="mb-1 flex justify-between text-xs text-default-500">
                            <span>{completedCount}/{milestoneCount} milestones</span>
                            <span>{pct}%</span>
                          </div>
                          <Progress value={pct} size="sm" color="primary" />
                        </div>
                      )}
                      <p className="mt-2 text-xs text-default-400">
                        {dayjs(course.createdAt).fromNow()}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
