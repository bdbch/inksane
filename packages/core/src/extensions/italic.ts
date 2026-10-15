import { insertContent } from "../commands/index.ts";
import { resolveFromTo } from "../helpers/resolveFromTo.ts";
import type { Extension, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    italic: {
      /**
       * Wraps the selection or range in `*`, or inserts `*content*` when
       * `content` is given.
       * @param options - Optional content to wrap, and the position or range.
       * @returns False when the range is already italic.
       */
      setItalic: (options?: { content?: string; pos?: PosOrRange }) => ReturnType;

      /**
       * Removes italic syntax from the given position or range, otherwise the current selection.
       * @param options An object containing the position or range to remove italic syntax from.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      removeItalic: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Toggles italic syntax for the given position or range, otherwise the current selection.
       * If the content is already italic, it will be unitalicized; otherwise, it will be wrapped in italic syntax.
       * @param options An object containing the position or range to toggle italic syntax for.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      toggleItalic: (options?: { pos?: PosOrRange }) => ReturnType;
    };
  }
}

const isBoldSyntax = (text: string) => /^(\*\*|__)((?:(?!\*\*|__)[\s\S])*)\1$/.test(text);
const isAlreadyItalic = (text: string) => {
  if (isBoldSyntax(text)) return null;
  return /^(\*|_)((?:(?!\*|_)[\s\S])*)\1$/.exec(text);
};

export const ItalicExtension: Extension = {
  name: "italic",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "Emphasis",
        className: "inksane-mark-italic",
        hideSyntax: true,
      },
    ];
  },

  addStateQueries() {
    return [{ name: "italic", nodeNames: ["Emphasis"] }];
  },

  addHtmlConverters() {
    return [
      {
        match: (element) => ["em", "i"].includes(element.tagName.toLowerCase()),
        toMarkdown: (element, { renderChildren }) => `*${renderChildren(element).trim()}*`,
      },
    ];
  },

  addCommands() {
    return {
      setItalic: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);

        if (options?.content !== undefined) {
          return insertContent(ctx)({ content: `*${options.content}*`, from, to });
        }

        const selectedText = ctx.state.sliceDoc(from, to);

        if (isAlreadyItalic(selectedText)) {
          return false;
        } else if (from === to) {
          ctx.dispatch({
            changes: { from, to, insert: "**" },
            selection: { anchor: from + 1, head: from + 1 },
          });
          return true;
        } else {
          return insertContent(ctx)({ content: `*${selectedText}*`, from, to });
        }
      },

      removeItalic: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);
        const match = isAlreadyItalic(selectedText);

        if (!match) {
          return false;
        } else {
          return insertContent(ctx)({ content: match[2], from, to });
        }
      },

      toggleItalic: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);

        if (isAlreadyItalic(selectedText)) {
          return ctx.editor.commands.removeItalic({ pos: { from, to } });
        } else {
          return ctx.editor.commands.setItalic({ pos: { from, to } });
        }
      },
    };
  },

  addKeybinds(ctx) {
    return [
      {
        key: "Mod-i",
        run() {
          return ctx.editor.commands.toggleItalic();
        },
      },
    ];
  },
};
