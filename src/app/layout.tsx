import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Toaster } from "react-hot-toast"
import "@/styles/globals.css"
import Providers from "./providers/providers"
import { TRPCReactProvider } from "@/trpc/react"

const font = Geist({ subsets: ["latin"] })

const APP_NAME = "VideoCourse"
const APP_DESCRIPTION = "Turn any YouTube video into a structured, interactive course with milestones, active recall, and quizzes."
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003"

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} – Learn from any video`,
    template: `%s – ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} – Learn from any video`,
    description: APP_DESCRIPTION,
    url: APP_URL,
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${font.className} min-h-screen bg-background text-foreground antialiased`}>
        <Providers>
          <TRPCReactProvider>
            {children}
          </TRPCReactProvider>
          <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        </Providers>
      </body>
    </html>
  )
}
