"use client"

import { Button, Spinner } from "@heroui/react"
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import type { DrawingResult } from "./DrawingCanvas"

// Excalidraw is ~600KB and touches `window` — never part of the initial note bundle
const DrawingCanvas = dynamic(() => import("./DrawingCanvas"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm">
      <Spinner label="Loading canvas…" />
    </div>
  ),
})

export default function DrawingNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: ReactNodeViewProps) {
  const scene = (node.attrs.scene as string) ?? ""
  const preview = (node.attrs.preview as string) ?? ""
  const height = (node.attrs.height as number) ?? 320
  const isEditable = editor.isEditable

  // A drawing inserted from the toolbar starts empty — open the canvas straight away
  const [isOpen, setIsOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)

  useEffect(() => {
    if (!scene && !everOpened && isEditable) {
      setIsOpen(true)
      setEverOpened(true)
    }
  }, [scene, everOpened, isEditable])

  function handleSave(result: DrawingResult) {
    updateAttributes(result)
    setIsOpen(false)
  }

  function handleCancel() {
    setIsOpen(false)
    // Nothing was ever drawn, so don't leave an empty placeholder behind
    if (!scene) deleteNode()
  }

  return (
    <NodeViewWrapper
      className="group relative my-4"
      data-drag-handle
      onDoubleClick={() => isEditable && setIsOpen(true)}
    >
      <div
        className={`relative overflow-hidden rounded-xl border bg-content1 transition-colors ${
          selected ? "border-primary ring-2 ring-primary/30" : "border-divider"
        }`}
      >
        {preview ? (
          // biome-ignore lint/performance/noImgElement: data URI, no remote fetch to optimise
          <img
            src={preview}
            alt="Drawing"
            className="w-full select-none object-contain p-2"
            style={{ maxHeight: height }}
            draggable={false}
          />
        ) : (
          <div
            className="grid place-items-center text-sm text-default-400"
            style={{ height: Math.min(height, 200) }}
          >
            Empty drawing
          </div>
        )}

        {isEditable && (
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <Button size="sm" variant="flat" onPress={() => setIsOpen(true)}>
              Edit
            </Button>
            <Button size="sm" variant="flat" color="danger" onPress={() => deleteNode()}>
              Delete
            </Button>
          </div>
        )}
      </div>

      {isOpen && (
        <DrawingCanvas isOpen={isOpen} scene={scene} onSave={handleSave} onCancel={handleCancel} />
      )}
    </NodeViewWrapper>
  )
}
