import type { EditorState } from "@codemirror/state";
import type { WidgetType } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { insertContent } from "../commands/index.ts";
import { escapeHtml } from "../helpers/escapeHtml.ts";
import { htmlWidget } from "../helpers/htmlWidget.ts";
import { isSafeUrl } from "../helpers/isSafeUrl.ts";
import { resolveFromTo } from "../helpers/resolveFromTo.ts";
import type { Extension, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
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

const OPEN_LINK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

/** Builds a clickable external-link icon next to a link. */
const createOpenLinkWidget = (url: string): WidgetType | null => {
  if (!url || !isSafeUrl(url)) {
    return null;
  }

  return htmlWidget(
    `<a class="inksane-mark-link-open" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="Open link in new tab">${OPEN_LINK_ICON}</a>`,
    {
      onRender: (element) => {
        const anchor = element.querySelector("a");
        if (!anchor) return;
        anchor.addEventListener("mousedown", (event) => event.preventDefault());
        anchor.addEventListener("click", (event) => {
          event.preventDefault();
          window.open(url, "_blank", "noopener");
        });
      },
    },
  );
};

/** Finds the URL of a `Link` syntax node. */
const getLinkUrl = (node: SyntaxNode, state: EditorState): string => {
  const url = node.getChild("URL");
  return url ? state.doc.sliceString(url.from, url.to) : "";
};

/** Context passed to the {@link LinkOptions.onLinkRequest} handler. */
export type LinkRequestContext = {
  /** The currently selected text, or an empty string when the selection is collapsed. */
  text: string;
};

/** Options for the link extension. */
export type LinkOptions = {
  /**
   * Supplies the URL when Mod-K creates a link. Return the URL to wrap the
   * current selection in a link, or a falsy value to cancel.
   *
   * Mod-K stays unbound while this option is not set.
   */
  onLinkRequest?: (context: LinkRequestContext) => string | null | undefined;
};

/**
 * Adds link commands, decorations, and the Mod-K keybinding.
 *
 * Without `onLinkRequest`, Mod-K is not bound at all, so the browser keeps it.
 */
export function LinkExtension(options: LinkOptions = {}): Extension {
  const { onLinkRequest } = options;

  return {
    name: "link",

    addMarkdownDecorations() {
      return [
        {
          nodeName: "Link",
          className: "inksane-mark-link",
          markup: ["LinkMark", "URL"],
          hideSyntax: true,
          widgets: [
            {
              kind: "attach",
              position: "after",
              type: (node, state) => createOpenLinkWidget(getLinkUrl(node, state)),
            },
          ],
        },
      ];
    },

    addHtmlConverters() {
      return [
        {
          match: (element) => element.tagName.toLowerCase() === "a",
          toMarkdown: (element, { renderChildren }) => {
            const text = renderChildren(element).trim();
            const href = (element.getAttribute("href") ?? "").trim();
            if (!href || !isSafeUrl(href)) return text;
            return `[${text || href}](${href})`;
          },
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
          const { from, to } = resolveFromTo(ctx.state, options.pos);
          const selectedText = ctx.state.sliceDoc(from, to);

          if (!options.url) {
            return false;
          }

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
          const { from, to } = resolveFromTo(ctx.state, options.pos);
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
      if (!onLinkRequest) {
        return [];
      }

      return [
        {
          key: "Mod-k",
          run(view) {
            const { from, to } = view.state.selection.main;
            const selectedText = view.state.sliceDoc(from, to);

            if (isAlreadyLink(selectedText)) {
              return ctx.editor.commands.removeLink();
            }

            const requested = onLinkRequest({ text: selectedText });
            const url = typeof requested === "string" ? requested.trim() : "";

            if (!url) {
              return false;
            }

            return ctx.editor.commands.setLink({ url });
          },
        },
      ];
    },
  };
}
