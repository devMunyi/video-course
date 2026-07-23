"use client"

import { Button } from "@heroui/react"
import Link from "next/link"

export default function CourseError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="max-w-sm text-sm text-default-500 font-mono bg-default-100 rounded-lg p-3">
        {error.message || "Unknown error"}
      </p>
      {error.digest && <p className="text-xs text-default-400">Digest: {error.digest}</p>}
      <Button as={Link} href="/dashboard" color="primary">
        Back to dashboard
      </Button>
    </div>
  )
}
