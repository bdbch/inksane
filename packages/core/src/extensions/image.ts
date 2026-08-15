import type { EditorState } from "@codemirror/state";
import { EditorView, WidgetType } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { insertContent } from "../commands/index.ts";
import { resolveFromTo } from "../helpers/resolveFromTo.ts";
import type { Extension, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    image: {
      /**
       * Inserts an image with the given src and alt text into the document.
       * @param options An object containing the src and alt text, and optionally the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      insertImage: (options: { src: string; alt: string; pos?: PosOrRange }) => ReturnType;
    };
  }
}

/** Renders an `<img>` in place of the hidden image syntax. Clicking it places the cursor at the end of the image range. */
class ImageWidget extends WidgetType {
  private src: string;
  private alt: string;
  private end: number;

  constructor(src: string, alt: string, end: number) {
    super();
    this.src = src;
    this.alt = alt;
    this.end = end;
  }

  toDOM(view: EditorView) {
    const img = document.createElement("img");
    img.className = "inksane-image";
    img.src = this.src;
    img.alt = this.alt;
    img.addEventListener("mousedown", (event) => {
      event.preventDefault();
      view.dispatch({ selection: { anchor: this.end, head: this.end } });
    });
    return img;
  }

  get estimatedHeight() {
    return 100;
  }

  eq(other: WidgetType) {
    return (
      other instanceof ImageWidget &&
      other.src === this.src &&
      other.alt === this.alt &&
      other.end === this.end
    );
  }
}

/** Extracts the src and alt text of an `Image` syntax node. */
const getImageSource = (node: SyntaxNode, state: EditorState): { src: string; alt: string } => {
  const url = node.getChild("URL");
  const src = url ? state.doc.sliceString(url.from, url.to) : "";

  let first: SyntaxNode | null = null;
  let second: SyntaxNode | null = null;
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.name !== "LinkMark") continue;
    if (!first) {
      first = child;
    } else {
      second = child;
      break;
    }
  }
  const alt = first && second ? state.doc.sliceString(first.to, second.from) : "";

  return { src, alt };
};

const escapeBrackets = (text: string) => text.replace(/[[\]\\]/g, "\\$&");
const escapeParens = (text: string) => text.replace(/[()\\]/g, "\\$&");

export const ImageExtension: Extension = {
  name: "image",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "Image",
        className: "inksane-mark-image",
        hideSyntax: true,
        markup: (node) => [{ from: node.from, to: node.to }],
        widgets: [
          {
            kind: "replace",
            type: (node, state) => {
              const { src, alt } = getImageSource(node, state);
              return new ImageWidget(src, alt, node.to);
            },
          },
        ],
      },
    ];
  },

  addCommands() {
    return {
      insertImage:
        (ctx) =>
        ({ src, alt, pos }) => {
          const { from, to } = resolveFromTo(ctx.state, pos);
          const content = `![${escapeBrackets(alt)}](${escapeParens(src)})`;
          return insertContent(ctx)({ content, from, to });
        },
    };
  },
};
