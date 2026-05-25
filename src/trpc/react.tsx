"use client"

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchStreamLink, loggerLink, TRPCClientError, type TRPCLink } from "@trpc/client"
import { createTRPCReact } from "@trpc/react-query"
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server"
import { observable } from "@trpc/server/observable"
import { useState } from "react"
import toast from "react-hot-toast"
import SuperJSON from "superjson"
import type { AppRouter } from "@/server/api/root"
import { createQueryClient } from "./query-client"

let clientQueryClientSingleton: QueryClient | undefined

const getQueryClient = () => {
  if (typeof window === "undefined") return createQueryClient()
  clientQueryClientSingleton ??= createQueryClient()
  return clientQueryClientSingleton
}

export const api = createTRPCReact<AppRouter>()
export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

let isRedirecting = false

const authErrorLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      return next(op).subscribe({
        next: (value) => observer.next(value),
        error: (err) => {
          if (err instanceof TRPCClientError) {
            if (err.data?.code === "UNAUTHORIZED" || err.message === "EXPIRED_SESSION_ERROR") {
              if (!isRedirecting) {
                isRedirecting = true
                toast.error("Session expired. Please log in again.")
                setTimeout(() => {
                  window.location.href = "/login"
                  isRedirecting = false
                }, 500)
              }
              return
            }
          }
          observer.error(err)
        },
        complete: () => observer.complete(),
      })
    })
  }
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        authErrorLink,
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: `${getBaseUrl()}/api/trpc`,
          headers: () => {
            const h = new Headers()
            h.set("x-trpc-source", "nextjs-react")
            return h
          },
        }),
      ],
    }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </api.Provider>
    </QueryClientProvider>
  )
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  return "http://localhost:3003"
}
