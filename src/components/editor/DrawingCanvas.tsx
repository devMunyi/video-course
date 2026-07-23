"use client"

import { Excalidraw, exportToSvg } from "@excalidraw/excalidraw"
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types"
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react"
import { useTheme } from "next-themes"
import { useCallback, useRef, useState } from "react"
import "@excalidraw/excalidraw/index.css"

export type DrawingScene = {
  elements: unknown[]
  appState: Record<string, unknown>
  files: Record<string, unknown>
}

export type DrawingResult = { scene: string; preview: string; height: number }

type Props = {
  isOpen: boolean
  /** Serialised scene to load, or "" for a blank canvas. */
  scene: string
  onSave: (result: DrawingResult) => void
  onCancel: () => void
}

const MAX_PREVIEW_HEIGHT = 480
const MIN_PREVIEW_HEIGHT = 160

function svgToDataUri(markup: string) {
  const bytes = new TextEncoder().encode(markup)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:image/svg+xml;base64,${btoa(binary)}`
}

function parseScene(scene: string): Partial<DrawingScene> | null {
  if (!scene) return null
  try {
    return JSON.parse(scene) as Partial<DrawingScene>
  } catch {
    return null
  }
}

export default function DrawingCanvas({ isOpen, scene, onSave, onCancel }: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const [saving, setSaving] = useState(false)
  const { resolvedTheme } = useTheme()
  const initial = parseScene(scene)

  const handleSave = useCallback(async () => {
    const api = apiRef.current
    if (!api) return
    setSaving(true)
    try {
      const elements = api.getSceneElements()
      const appState = api.getAppState()
      const files = api.getFiles()

      // Nothing drawn — treat Save as Cancel rather than storing a blank block
      if (elements.length === 0) {
        onCancel()
        return
      }

      const svg = await exportToSvg({
        elements,
        appState: { ...appState, exportBackground: false, exportWithDarkMode: false },
        files,
        exportPadding: 16,
      })
      // Scale to the note column; keep the aspect ratio via viewBox
      const vbHeight = Number(svg.getAttribute("height")?.replace(/[^\d.]/g, "")) || 320
      const vbWidth = Number(svg.getAttribute("width")?.replace(/[^\d.]/g, "")) || 640
      svg.setAttribute("width", "100%")
      svg.removeAttribute("height")
      const height = Math.round(
        Math.min(MAX_PREVIEW_HEIGHT, Math.max(MIN_PREVIEW_HEIGHT, (vbHeight / vbWidth) * 720)),
      )

      const preview = svgToDataUri(new XMLSerializer().serializeToString(svg))

      onSave({
        scene: JSON.stringify({
          elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            gridSize: appState.gridSize,
          },
          files,
        }),
        preview,
        height,
      })
    } finally {
      setSaving(false)
    }
  }, [onCancel, onSave])

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onCancel()}
      size="full"
      scrollBehavior="inside"
      classNames={{ body: "p-0" }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 text-base">
          ✏️ Drawing
          <span className="text-xs font-normal text-default-400">
            Esc or Cancel discards changes
          </span>
        </ModalHeader>
        <ModalBody>
          <div className="h-full min-h-[60vh] w-full">
            <Excalidraw
              excalidrawAPI={(api) => {
                apiRef.current = api
              }}
              initialData={
                initial
                  ? {
                      elements: initial.elements as never,
                      appState: { ...initial.appState, collaborators: new Map() } as never,
                      files: initial.files as never,
                      scrollToContent: true,
                    }
                  : undefined
              }
              theme={resolvedTheme === "dark" ? "dark" : "light"}
              UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false } }}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onCancel}>
            Cancel
          </Button>
          <Button color="primary" isLoading={saving} onPress={() => void handleSave()}>
            Save drawing
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
