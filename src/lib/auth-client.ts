"use client"
import { createAuthClient } from "better-auth/react"

function getBaseURL() {
  if (typeof window !== "undefined") return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL ?? ""
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
})

export const { signIn, signOut, useSession } = authClient
