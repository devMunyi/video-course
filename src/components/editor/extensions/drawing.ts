import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import DrawingNodeView from "../DrawingNodeView"

export type DrawingAttrs = {
  /** Excalidraw scene: JSON string of { elements, appState, files }. Source of truth for editing. */
  scene: string
  /** Rendered SVG data URI, painted instantly so the heavy canvas only loads on edit. */
  preview: string
  /** Rendered height in px, so the note doesn't jump while the preview loads. */
  height: number
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    drawing: {
      insertDrawing: (attrs?: Partial<DrawingAttrs>) => ReturnType
      updateDrawing: (pos: number, attrs: Partial<DrawingAttrs>) => ReturnType
    }
  }
}

export const Drawing = Node.create({
  name: "drawing",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      scene: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-scene") ?? "",
        renderHTML: (attrs) => ({ "data-scene": attrs.scene }),
      },
      preview: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-preview") ?? "",
        renderHTML: (attrs) => ({ "data-preview": attrs.preview }),
      },
      height: {
        default: 320,
        parseHTML: (el) => Number(el.getAttribute("data-height")) || 320,
        renderHTML: (attrs) => ({ "data-height": String(attrs.height) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "excalidraw-drawing" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["excalidraw-drawing", mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawingNodeView)
  },

  addCommands() {
    return {
      insertDrawing:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { scene: "", preview: "", height: 320, ...attrs },
          }),
      updateDrawing:
        (pos, attrs) =>
        ({ tr, dispatch }) => {
          const node = tr.doc.nodeAt(pos)
          if (!node || node.type.name !== this.name) return false
          if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs })
          return true
        },
    }
  },
})

export default Drawing
