"use client"

import { useState } from "react"
import { Button, Card, CardBody } from "@heroui/react"
import { signIn } from "@/lib/auth-client"
import toast from "react-hot-toast"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    setLoading(true)
    try {
      await signIn.social({ provider: "google", callbackURL: "/dashboard" })
    } catch {
      toast.error("Sign-in failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-default-50 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary">VideoCourse</h1>
        <p className="mt-2 text-default-500">Sign in to start learning</p>
      </div>

      <Card className="w-full max-w-sm shadow-md">
        <CardBody className="gap-4 p-6">
          <Button
            onPress={handleGoogle}
            isLoading={loading}
            variant="bordered"
            startContent={
              !loading && (
                <svg viewBox="0 0 24 24" className="size-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )
            }
            className="w-full"
          >
            Continue with Google
          </Button>

          <p className="text-center text-xs text-default-400">
            By continuing you agree to our Terms of Service
          </p>
        </CardBody>
      </Card>
    </main>
  )
}
