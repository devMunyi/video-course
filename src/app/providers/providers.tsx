"use client"

import { ProgressProvider } from "@bprogress/next/app"
import { HeroUIProvider } from "@heroui/react"
import { ThemeProvider } from "next-themes"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <HeroUIProvider>
        <ProgressProvider
          height="3px"
          color="#7c3aed"
          options={{ showSpinner: false }}
          shallowRouting
        >
          {children}
        </ProgressProvider>
      </HeroUIProvider>
    </ThemeProvider>
  )
}
