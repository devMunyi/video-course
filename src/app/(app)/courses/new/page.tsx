"use client"

import { Button, Card, CardBody, Input } from "@heroui/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import toast from "react-hot-toast"
import { z } from "zod"
import { ThemeToggle } from "@/components/ThemeToggle"
import { api } from "@/trpc/react"

const YOUTUBE_REGEX = /(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/
const youtubeSchema = z.url().refine((v) => YOUTUBE_REGEX.test(v))

function isValidYouTubeUrl(value: string): boolean {
  return youtubeSchema.safeParse(value).success
}

export default function NewCoursePage() {
  const router = useRouter()
  const [url, setUrl] = useState("")

  const isDirty = url.trim().length > 0
  const isValid = isValidYouTubeUrl(url.trim())

  const create = api.course.create.useMutation({
    onSuccess: ({ courseId }) => {
      router.push(`/courses/${courseId}`)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    create.mutate({ youtubeUrl: url.trim() })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b border-divider px-6 py-4">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          VideoCourse
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button as={Link} href="/dashboard" variant="ghost" size="sm">
            ← Back
          </Button>
        </div>
      </nav>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg text-center">
          <h1 className="mb-2 text-3xl font-bold">Create a new course</h1>
          <p className="mb-8 text-default-500">
            Paste any YouTube URL — we&apos;ll handle the rest
          </p>

          <Card className="shadow-md">
            <CardBody className="p-6">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  value={url}
                  onValueChange={setUrl}
                  placeholder="https://youtube.com/watch?v=..."
                  size="lg"
                  variant="bordered"
                  isInvalid={isDirty && !isValid}
                  errorMessage={
                    isDirty && !isValid ? "Please enter a valid YouTube URL" : undefined
                  }
                  color={isDirty ? (isValid ? "success" : "danger") : "default"}
                  startContent={
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-red-500">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  }
                  isDisabled={create.isPending}
                />
                <Button
                  type="submit"
                  color="primary"
                  size="lg"
                  isLoading={create.isPending}
                  isDisabled={!isValid}
                  className="w-full"
                >
                  {create.isPending ? "Creating course..." : "Generate course"}
                </Button>
              </form>
            </CardBody>
          </Card>

          <div className="mt-6 grid grid-cols-3 gap-4 text-center text-sm text-default-500">
            <div>
              <div className="text-2xl">⚡</div>
              <div>~45 sec</div>
            </div>
            <div>
              <div className="text-2xl">🗺️</div>
              <div>4–6 milestones</div>
            </div>
            <div>
              <div className="text-2xl">📝</div>
              <div>Quiz + recall</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
