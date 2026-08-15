import type { EditorState } from "@codemirror/state";
import { WidgetType } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { insertContent } from "../commands/index.ts";
import type { InkwellExtension, PosOrRange } from "../types/index.ts";

declare module "@inkwell/core" {
  interface Commands<ReturnType> {
    link: {
      /**
       * Inserts a link with the given content and url into the document.
       * @param options An object containing the content and url, and optionally the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      insertLink: (options: { content: string; url: string; pos?: PosOrRange }) => ReturnType;

      /**
       * Wraps existing content with a link at the specified position or range in the document, otherwise uses the current selection.
       * @param options An object containing the url, and optionally the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      setLink: (options: { url: string; pos?: PosOrRange }) => ReturnType;

      /**
       * Removes link syntax from the specified position or range in the document, otherwise uses the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      removeLink: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Toggles link syntax for the specified position or range in the document, otherwise uses the current selection.
       * If the content is already a link, it will be unlinked; otherwise, it will be wrapped in link syntax.
       * @param options An object containing the url, and optionally the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      toggleLink: (options: { url: string; pos?: PosOrRange }) => ReturnType;
    };
  }
}

const isAlreadyLink = (text: string) => /^\[([^\]]*)\]\(([^)]*)\)$/.exec(text);

/** Returns true for URLs using an allowed scheme (http, https, mailto). */
const isSafeUrl = (url: string): boolean => {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" || protocol === "mailto:";
  } catch {
    return false;
  }
};

/** Renders a clickable external-link icon next to a link. */
class OpenLinkWidget extends WidgetType {
  private url: string;

  constructor(url: string) {
    super();
    this.url = url;
  }

  toDOM() {
    if (!isSafeUrl(this.url)) {
      return document.createElement("span");
    }

    const el = document.createElement("a");
    el.className = "inkwell-mark-link-open";
    el.href = this.url;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
    el.setAttribute("aria-label", "Open link in new tab");
    el.addEventListener("mousedown", (event) => event.preventDefault());
    el.addEventListener("click", (event) => {
      event.preventDefault();
      window.open(this.url, "_blank", "noopener");
    });
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
    return el;
  }

  ignoreEvent() {
    return true;
  }

  eq(other: WidgetType) {
    return other instanceof OpenLinkWidget && other.url === this.url;
  }
}

/** Finds the URL of a `Link` syntax node. */
const getLinkUrl = (node: SyntaxNode, state: EditorState): string => {
  const url = node.getChild("URL");
  return url ? state.doc.sliceString(url.from, url.to) : "";
};

const resolveFromTo = (state: EditorState, pos?: PosOrRange): { from: number; to: number } => {
  const from = typeof pos === "number" ? pos : (pos?.from ?? state.selection.main.from);
  const to = typeof pos === "number" ? pos : (pos?.to ?? state.selection.main.to);
  return { from, to };
};

export const LinkExtension: InkwellExtension = {
  name: "link",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "Link",
        className: "inkwell-mark-link",
        markup: ["LinkMark", "URL"],
        hideSyntax: true,
        widgets: [
          {
            kind: "attach",
            position: "after",
            type: (node, state) => new OpenLinkWidget(getLinkUrl(node, state)),
          },
        ],
      },
    ];
  },

  addCommands() {
    return {
      insertLink:
        (ctx) =>
        ({ content, url, pos }) => {
          const { from, to } = resolveFromTo(ctx.state, pos);
          return insertContent(ctx)({ content: `[${content}](${url})`, from, to });
        },

      setLink: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);

        if (isAlreadyLink(selectedText)) {
          return false;
        } else {
          return insertContent(ctx)({ content: `[${selectedText}](${options.url})`, from, to });
        }
      },

      removeLink: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);
        const match = isAlreadyLink(selectedText);

        if (!match) {
          return false;
        } else {
          return insertContent(ctx)({ content: match[1], from, to });
        }
      },

      toggleLink: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);

        if (isAlreadyLink(selectedText)) {
          return ctx.editor.commands.removeLink({ pos: { from, to } });
        } else {
          return ctx.editor.commands.setLink({ url: options.url, pos: { from, to } });
        }
      },
    };
  },

  addKeybinds(ctx) {
    return [
      {
        key: "Mod-k",
        run() {
          return ctx.editor.commands.toggleLink({ url: "" });
        },
      },
    ];
  },
};
