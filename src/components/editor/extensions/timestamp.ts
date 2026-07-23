import { Node, mergeAttributes } from "@tiptap/core"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    timestamp: {
      /** Insert a clickable video timestamp chip at the caret. */
      insertTimestamp: (seconds: number, label: string) => ReturnType
    }
  }
}

/**
 * Inline atom holding a video position. Clicking one seeks the embedded player
 * (handled in RichTextEditor via the data-timestamp attribute).
 */
export const Timestamp = Node.create({
  name: "timestamp",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      seconds: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute("data-timestamp")) || 0,
        renderHTML: (attrs) => ({ "data-timestamp": String(attrs.seconds) }),
      },
      label: {
        default: "0:00",
        parseHTML: (el) => el.textContent ?? "0:00",
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-timestamp]" }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "note-timestamp",
        title: "Jump to this point in the video",
      }),
      `⏱ ${node.attrs.label as string}`,
    ]
  },

  renderText({ node }) {
    return `[${node.attrs.label as string}]`
  },

  addCommands() {
    return {
      insertTimestamp:
        (seconds, label) =>
        ({ chain }) =>
          chain()
            .insertContent([
              { type: this.name, attrs: { seconds, label } },
              { type: "text", text: " " },
            ])
            .run(),
    }
  },
})

export default Timestamp
