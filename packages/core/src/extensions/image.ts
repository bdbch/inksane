import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import { insertContent } from "../commands/index.ts";
import { escapeHtml } from "../helpers/escapeHtml.ts";
import { htmlWidget } from "../helpers/htmlWidget.ts";
import { isSafeUrl } from "../helpers/isSafeUrl.ts";
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

/**
 * Builds an image widget. Clicking it places the cursor at the end of the image range.
 * The block variant renders below the source line inside its own `cm-line`.
 */
const createImageWidget = (src: string, alt: string, end: number, block: boolean) => {
  if (!isSafeUrl(src)) {
    return htmlWidget("");
  }

  return htmlWidget(
    `<img class="inksane-image" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">`,
    {
      block,
      className: block ? "cm-line" : undefined,
      estimatedHeight: 100,
      onRender: (element, view) => {
        element.addEventListener("mousedown", (event) => {
          event.preventDefault();
          view.dispatch({ selection: { anchor: end, head: end } });
        });
      },
    },
  );
};

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
              return createImageWidget(src, alt, node.to, false);
            },
          },
          {
            kind: "attach",
            onlyWhenVisible: true,
            block: true,
            position: (node, state) => state.doc.lineAt(node.to).to,
            type: (node, state) => {
              const { src, alt } = getImageSource(node, state);
              return createImageWidget(src, alt, node.to, true);
            },
          },
        ],
      },
    ];
  },

  addHtmlConverters() {
    return [
      {
        match: (element) => element.tagName.toLowerCase() === "img",
        toMarkdown: (element) => {
          const src = (element.getAttribute("src") ?? "").trim();
          if (!src || !isSafeUrl(src)) return "";
          const alt = escapeBrackets(element.getAttribute("alt") ?? "");
          return `![${alt}](${escapeParens(src)})`;
        },
      },
    ];
  },

  addCommands() {
    return {
      insertImage:
        (ctx) =>
        ({ src, alt, pos }) => {
          if (!isSafeUrl(src)) {
            return false;
          }
          const { from, to } = resolveFromTo(ctx.state, pos);
          const content = `![${escapeBrackets(alt)}](${escapeParens(src)})`;
          return insertContent(ctx)({ content, from, to });
        },
    };
  },
};
