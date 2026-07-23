"use client"

import { Button, Divider, Popover, PopoverContent, PopoverTrigger, Tooltip } from "@heroui/react"
import type { Editor } from "@tiptap/react"
import { useEditorState } from "@tiptap/react"
import {
  Bold,
  CheckSquare,
  Clock,
  Code,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Palette,
  Pencil,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react"
import { useRef } from "react"
import { insertImageFiles } from "./insert-image"

type Props = {
  editor: Editor
  isExpanded: boolean
  onToggleExpand: () => void
  /** Present only when a video player is available to stamp from. */
  onInsertTimestamp?: () => void
}

/** Text colours picked for trade notes: neutral, long, short, caution, info. */
const TEXT_COLORS = [
  { label: "Default", value: null, swatch: "#71717a" },
  { label: "Long / bullish", value: "#16a34a", swatch: "#16a34a" },
  { label: "Short / bearish", value: "#dc2626", swatch: "#dc2626" },
  { label: "Caution", value: "#d97706", swatch: "#d97706" },
  { label: "Info", value: "#2563eb", swatch: "#2563eb" },
]

const HIGHLIGHTS = [
  { label: "Yellow", value: "#fde68a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Red", value: "#fecaca" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Purple", value: "#e9d5ff" },
]

function ToolButton({
  label,
  isActive,
  isDisabled,
  onPress,
  children,
}: {
  label: string
  isActive?: boolean
  isDisabled?: boolean
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip content={label} delay={400} closeDelay={0} size="sm">
      <Button
        isIconOnly
        size="sm"
        radius="sm"
        variant={isActive ? "flat" : "light"}
        color={isActive ? "primary" : "default"}
        isDisabled={isDisabled}
        aria-label={label}
        aria-pressed={isActive}
        onPress={onPress}
        className="min-w-8 shrink-0"
      >
        {children}
      </Button>
    </Tooltip>
  )
}

export default function EditorToolbar({
  editor,
  isExpanded,
  onToggleExpand,
  onInsertTimestamp,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      highlight: e.isActive("highlight"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      color: (e.getAttributes("textStyle").color as string | undefined) ?? null,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })

  function setLink() {
    const previous = (editor.getAttributes("link").href as string | undefined) ?? ""
    const url = window.prompt("Link URL", previous)
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-divider bg-content1/95 px-2 py-1.5 backdrop-blur">
      <ToolButton
        label="Undo (Ctrl+Z)"
        isDisabled={!state.canUndo}
        onPress={() => editor.chain().focus().undo().run()}
      >
        <Undo2 size={16} />
      </ToolButton>
      <ToolButton
        label="Redo (Ctrl+Shift+Z)"
        isDisabled={!state.canRedo}
        onPress={() => editor.chain().focus().redo().run()}
      >
        <Redo2 size={16} />
      </ToolButton>

      <Divider orientation="vertical" className="mx-1 h-5" />

      <ToolButton
        label="Heading 1 (Ctrl+Alt+1)"
        isActive={state.h1}
        onPress={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <span className="text-xs font-bold">H1</span>
      </ToolButton>
      <ToolButton
        label="Heading 2 (Ctrl+Alt+2)"
        isActive={state.h2}
        onPress={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <span className="text-xs font-bold">H2</span>
      </ToolButton>
      <ToolButton
        label="Heading 3 (Ctrl+Alt+3)"
        isActive={state.h3}
        onPress={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <span className="text-xs font-bold">H3</span>
      </ToolButton>

      <Divider orientation="vertical" className="mx-1 h-5" />

      <ToolButton
        label="Bold (Ctrl+B)"
        isActive={state.bold}
        onPress={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </ToolButton>
      <ToolButton
        label="Italic (Ctrl+I)"
        isActive={state.italic}
        onPress={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </ToolButton>
      <ToolButton
        label="Underline (Ctrl+U)"
        isActive={state.underline}
        onPress={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon size={16} />
      </ToolButton>
      <ToolButton
        label="Strikethrough"
        isActive={state.strike}
        onPress={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={16} />
      </ToolButton>
      <ToolButton
        label="Inline code"
        isActive={state.code}
        onPress={() => editor.chain().focus().toggleCode().run()}
      >
        <Code size={16} />
      </ToolButton>

      <Popover placement="bottom" showArrow>
        <Tooltip content="Text colour" delay={400} closeDelay={0} size="sm">
          <div className="inline-flex">
            <PopoverTrigger>
              <Button
                isIconOnly
                size="sm"
                radius="sm"
                variant="light"
                aria-label="Text colour"
                className="min-w-8 shrink-0"
              >
                <Palette size={16} color={state.color ?? undefined} />
              </Button>
            </PopoverTrigger>
          </div>
        </Tooltip>
        <PopoverContent className="flex-row gap-1 p-2">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.label}
              type="button"
              title={c.label}
              aria-label={c.label}
              className="size-6 rounded-full border border-divider transition-transform hover:scale-110"
              style={{ backgroundColor: c.swatch }}
              onClick={() =>
                c.value
                  ? editor.chain().focus().setColor(c.value).run()
                  : editor.chain().focus().unsetColor().run()
              }
            />
          ))}
        </PopoverContent>
      </Popover>

      <Popover placement="bottom" showArrow>
        <Tooltip content="Highlight" delay={400} closeDelay={0} size="sm">
          <div className="inline-flex">
            <PopoverTrigger>
              <Button
                isIconOnly
                size="sm"
                radius="sm"
                variant={state.highlight ? "flat" : "light"}
                color={state.highlight ? "primary" : "default"}
                aria-label="Highlight"
                className="min-w-8 shrink-0"
              >
                <Highlighter size={16} />
              </Button>
            </PopoverTrigger>
          </div>
        </Tooltip>
        <PopoverContent className="flex-row gap-1 p-2">
          {HIGHLIGHTS.map((h) => (
            <button
              key={h.value}
              type="button"
              title={h.label}
              aria-label={h.label}
              className="size-6 rounded-full border border-divider transition-transform hover:scale-110"
              style={{ backgroundColor: h.value }}
              onClick={() => editor.chain().focus().setHighlight({ color: h.value }).run()}
            />
          ))}
          <button
            type="button"
            title="Remove highlight"
            aria-label="Remove highlight"
            className="size-6 rounded-full border border-divider text-xs transition-transform hover:scale-110"
            onClick={() => editor.chain().focus().unsetHighlight().run()}
          >
            ✕
          </button>
        </PopoverContent>
      </Popover>

      <Divider orientation="vertical" className="mx-1 h-5" />

      <ToolButton
        label="Bullet list"
        isActive={state.bullet}
        onPress={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={16} />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        isActive={state.ordered}
        onPress={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={16} />
      </ToolButton>
      <ToolButton
        label="Checklist"
        isActive={state.task}
        onPress={() => editor.chain().focus().toggleTaskList().run()}
      >
        <CheckSquare size={16} />
      </ToolButton>
      <ToolButton
        label="Quote"
        isActive={state.quote}
        onPress={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={16} />
      </ToolButton>
      <ToolButton label="Divider" onPress={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus size={16} />
      </ToolButton>

      <Divider orientation="vertical" className="mx-1 h-5" />

      <ToolButton label="Link (Ctrl+K)" isActive={state.link} onPress={setLink}>
        <LinkIcon size={16} />
      </ToolButton>
      <ToolButton label="Insert image" onPress={() => fileRef.current?.click()}>
        <ImageIcon size={16} />
      </ToolButton>
      <ToolButton
        label="Insert table"
        onPress={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <TableIcon size={16} />
      </ToolButton>
      <ToolButton
        label="Insert drawing"
        onPress={() => editor.chain().focus().insertDrawing().run()}
      >
        <Pencil size={16} />
      </ToolButton>
      {onInsertTimestamp && (
        <ToolButton label="Stamp video time (Ctrl+Shift+T)" onPress={onInsertTimestamp}>
          <Clock size={16} />
        </ToolButton>
      )}

      <div className="ml-auto flex items-center">
        <ToolButton
          label={isExpanded ? "Exit full screen (Esc)" : "Full screen"}
          onPress={onToggleExpand}
        >
          {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </ToolButton>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) void insertImageFiles(editor, files)
          e.target.value = ""
        }}
      />
    </div>
  )
}
