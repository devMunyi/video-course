"use client"

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react"
import { toPng } from "html-to-image"
import { useRef, useState } from "react"

type Props = {
  isOpen: boolean
  onClose: () => void
  courseTitle: string
  userName: string
  completedAt: Date
}

export default function CompletionCertificate({
  isOpen,
  onClose,
  courseTitle,
  userName,
  completedAt,
}: Props) {
  const certRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    if (!certRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(certRef.current, { pixelRatio: 2 })
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `certificate-${courseTitle.toLowerCase().replace(/\s+/g, "-")}.png`
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  const dateStr = completedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} size="2xl">
      <ModalContent>
        <ModalHeader className="text-lg font-bold">🎉 Course Complete!</ModalHeader>
        <ModalBody>
          {/* Certificate card — this is what gets exported as PNG */}
          <div
            ref={certRef}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-10 text-center dark:from-primary-900/30 dark:via-background dark:to-secondary-900/20"
            style={{ fontFamily: "sans-serif" }}
          >
            {/* Decorative rings */}
            <div className="absolute -right-12 -top-12 size-48 rounded-full border-4 border-primary/10" />
            <div className="absolute -bottom-16 -left-16 size-64 rounded-full border-4 border-secondary/10" />

            <div className="relative">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Certificate of Completion
              </p>
              <div className="my-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              <p className="mb-1 text-sm text-default-500">This certifies that</p>
              <p className="my-2 text-2xl font-bold text-default-900">{userName}</p>
              <p className="mb-2 text-sm text-default-500">has successfully completed</p>
              <p className="my-3 text-xl font-semibold text-primary">{courseTitle}</p>

              <div className="my-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              <p className="text-xs text-default-400">{dateStr}</p>
              <p className="mt-3 text-xs font-semibold tracking-wider text-default-400">
                VideoCourse
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onPress={onClose}>
            Close
          </Button>
          <Button color="primary" isLoading={downloading} onPress={handleDownload}>
            Download PNG
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
