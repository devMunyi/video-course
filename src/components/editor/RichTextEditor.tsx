"use client"

import { Button, Divider } from "@heroui/react"
import Highlight from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { Placeholder } from "@tiptap/extension-placeholder"
import { TableKit } from "@tiptap/extension-table"
import TextAlign from "@tiptap/extension-text-align"
import { Color, TextStyle } from "@tiptap/extension-text-style"
import { type Editor, EditorContent, useEditor } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import {
  Bold,
  Clock,
  Highlighter,
  Italic,
  Link as LinkIcon,
  Pencil,
  Strikethrough,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { formatTimestamp } from "../course/video-player-context"
import EditorToolbar from "./EditorToolbar"
import { Drawing } from "./extensions/drawing"
import { Timestamp } from "./extensions/timestamp"
import { insertImageFiles } from "./insert-image"

type Props = {
  /** HTML. Only applied to the editor when it differs from the current document. */
  value: string
  onChange: (html: string) => void
  placeholder?: string
  /** Rendered read-only, without the toolbar. */
  editable?: boolean
  minHeight?: number
  /** Returns the video's current position; enables the timestamp button when given. */
  getVideoTime?: () => number | null
  /** Called when a timestamp chip inside the note is clicked. */
  onSeek?: (seconds: number) => void
  /** Overrides the built-in full-screen toggle (study mode drives the layout instead). */
  onToggleExpand?: () => void
  isExpanded?: boolean
  /** Fill the parent's height instead of sizing to content — used by the study-mode pane. */
  fill?: boolean
}

const HINTS_KEY = "note-editor-hints-dismissed"

/** One-time discoverability strip — the toolbar icons alone don't advertise these. */
function EditorHints({ hasVideo }: { hasVideo: boolean }) {
  const [dismissed, setDismissed] = useState(true)

  // Read after mount so the server and client render the same markup
  useEffect(() => {
    setDismissed(window.localStorage.getItem(HINTS_KEY) === "1")
  }, [])

  if (dismissed) return null

  return (
    <div className="flex items-start gap-2 border-b border-divider bg-default-50 px-3 py-1.5 text-xs text-default-500">
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          <Pencil size={12} className="inline align-[-1px]" /> draw charts on a canvas
        </span>
        {hasVideo && (
          <span>
            <Clock size={12} className="inline align-[-1px]" /> or{" "}
            <kbd className="rounded bg-default-200 px-1 font-mono">Ctrl+Shift+T</kbd> stamps the
            video time — click a stamp to jump back
          </span>
        )}
        <span>paste a chart screenshot straight in</span>
      </span>
      <button
        type="button"
        aria-label="Dismiss tips"
        className="ml-auto shrink-0 rounded px-1 hover:bg-default-200"
        onClick={() => {
          window.localStorage.setItem(HINTS_KEY, "1")
          setDismissed(true)
        }}
      >
        ✕
      </button>
    </div>
  )
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your notes…",
  editable = true,
  minHeight = 220,
  getVideoTime,
  onSeek,
  onToggleExpand,
  isExpanded: expandedProp,
  fill = false,
}: Props) {
  const [ownExpanded, setOwnExpanded] = useState(false)
  const isExpanded = expandedProp ?? ownExpanded
  const usesOwnExpand = onToggleExpand === undefined

  // ProseMirror handlers are created once, so they read the latest props via refs
  const editorRef = useRef<Editor | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  /** False until the user actually interacts with this editor instance. */
  const hasUserTouchedRef = useRef(false)
  const onSeekRef = useRef(onSeek)
  onSeekRef.current = onSeek
  const getVideoTimeRef = useRef(getVideoTime)
  getVideoTimeRef.current = getVideoTime

  function insertTimestamp() {
    const seconds = getVideoTimeRef.current?.()
    if (seconds === null || seconds === undefined) return
    editorRef.current
      ?.chain()
      .focus()
      .insertTimestamp(Math.floor(seconds), formatTimestamp(seconds))
      .run()
  }

  function promptForLink() {
    const editorInstance = editorRef.current
    if (!editorInstance) return
    const previous = (editorInstance.getAttributes("link").href as string | undefined) ?? ""
    const url = window.prompt("Link URL", previous)
    if (url === null) return
    if (url === "") {
      editorInstance.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editorInstance.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  const editor = useEditor({
    // Rendering on the server and again on the client makes React complain about
    // the ProseMirror DOM it doesn't own
    immediatelyRender: false,
    editable,
    content: value,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer" },
        },
        codeBlock: { HTMLAttributes: { class: "note-code-block" } },
      }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({ table: { resizable: true } }),
      Drawing,
      Timestamp,
    ],
    editorProps: {
      attributes: {
        class: "note-prose focus:outline-none",
        style: `min-height:${minHeight}px`,
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        )
        const instance = editorRef.current
        if (!files.length || !instance) return false
        hasUserTouchedRef.current = true
        event.preventDefault()
        void insertImageFiles(instance, files)
        return true
      },
      handleDrop: (_view, event) => {
        const dropped = event as DragEvent
        const files = Array.from(dropped.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        )
        const instance = editorRef.current
        if (!files.length || !instance) return false
        hasUserTouchedRef.current = true
        event.preventDefault()
        void insertImageFiles(instance, files)
        return true
      },
      handleKeyDown: (_view, event) => {
        hasUserTouchedRef.current = true
        const mod = event.metaKey || event.ctrlKey
        if (mod && !event.shiftKey && event.key.toLowerCase() === "k") {
          event.preventDefault()
          promptForLink()
          return true
        }
        // Ctrl/Cmd+Shift+T stamps the current video position into the note
        if (mod && event.shiftKey && event.key.toLowerCase() === "t") {
          event.preventDefault()
          insertTimestamp()
          return true
        }
        return false
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement | null
        const chip = target?.closest?.("[data-timestamp]")
        if (!chip) return false
        const seconds = Number(chip.getAttribute("data-timestamp"))
        if (!Number.isFinite(seconds) || !onSeekRef.current) return false
        onSeekRef.current(seconds)
        return true
      },
    },
    // Marks this editor as genuinely touched. Toolbar commands all focus first,
    // so this covers them too.
    onFocus: () => {
      hasUserTouchedRef.current = true
    },
    onCreate: ({ editor: e }) => {
      editorRef.current = e
    },
    onUpdate: ({ editor: e }) => {
      // Tiptap emits updates for its own initialisation and plugin transactions.
      // On an editor the user has never touched, those carry the empty document,
      // and forwarding them overwrote real notes with "<p></p>". Only a touched
      // editor is allowed to report changes.
      if (!hasUserTouchedRef.current) return
      onChangeRef.current(e.getHTML())
    },
  })

  // Adopt an externally changed document (milestone switch, first server load).
  // Never while focused — that would move the caret mid-typing.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (editor.isFocused) return
    if (editor.getHTML() === value) return
    editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(editable)
  }, [editor, editable])

  // Esc leaves the editor's own full-screen mode
  useEffect(() => {
    if (!isExpanded || !usesOwnExpand) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOwnExpanded(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isExpanded, usesOwnExpand])

  // Lock background scroll while full screen
  useEffect(() => {
    if (!isExpanded || !usesOwnExpand) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [isExpanded, usesOwnExpand])

  if (!editor) {
    return (
      <div
        className={`rounded-xl border border-divider bg-content1 ${fill ? "h-full" : ""}`}
        style={fill ? undefined : { minHeight: minHeight + 44 }}
      />
    )
  }

  if (!editable) {
    return <EditorContent editor={editor} />
  }

  const shellClass =
    isExpanded && usesOwnExpand
      ? "fixed inset-0 z-50 flex flex-col bg-background p-4 sm:p-6"
      : fill
        ? "flex h-full min-h-0 flex-col"
        : "flex flex-col"

  return (
    <div className={shellClass}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-divider bg-content1 focus-within:border-primary/60">
        <EditorToolbar
          editor={editor}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand ?? (() => setOwnExpanded((v) => !v))}
          onInsertTimestamp={getVideoTime ? insertTimestamp : undefined}
        />
        <EditorHints hasVideo={getVideoTime !== undefined} />
        {/* biome-ignore lint/a11y/noStaticElementInteractions: click target only forwards focus to the editor below */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: the editor itself owns keyboard interaction */}
        <div
          className={`min-h-0 flex-1 cursor-text overflow-y-auto px-4 py-3 ${
            isExpanded || fill ? "" : "max-h-[60vh]"
          }`}
          onClick={(e) => {
            // Clicking the padding around the document should still place the caret
            if (e.target === e.currentTarget) editor.chain().focus("end").run()
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      <BubbleMenu
        editor={editor}
        options={{ placement: "top" }}
        className="flex items-center gap-0.5 rounded-lg border border-divider bg-content1 p-1 shadow-lg"
      >
        <Button
          isIconOnly
          size="sm"
          radius="sm"
          variant={editor.isActive("bold") ? "flat" : "light"}
          aria-label="Bold"
          onPress={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </Button>
        <Button
          isIconOnly
          size="sm"
          radius="sm"
          variant={editor.isActive("italic") ? "flat" : "light"}
          aria-label="Italic"
          onPress={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </Button>
        <Button
          isIconOnly
          size="sm"
          radius="sm"
          variant={editor.isActive("strike") ? "flat" : "light"}
          aria-label="Strikethrough"
          onPress={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={15} />
        </Button>
        <Button
          isIconOnly
          size="sm"
          radius="sm"
          variant={editor.isActive("highlight") ? "flat" : "light"}
          aria-label="Highlight"
          onPress={() => editor.chain().focus().toggleHighlight({ color: "#fde68a" }).run()}
        >
          <Highlighter size={15} />
        </Button>
        <Divider orientation="vertical" className="mx-0.5 h-5" />
        <Button
          isIconOnly
          size="sm"
          radius="sm"
          variant={editor.isActive("link") ? "flat" : "light"}
          aria-label="Link"
          onPress={promptForLink}
        >
          <LinkIcon size={15} />
        </Button>
      </BubbleMenu>
    </div>
  )
}
