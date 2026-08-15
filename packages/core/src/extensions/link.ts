import type { EditorState } from "@codemirror/state";
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
};
