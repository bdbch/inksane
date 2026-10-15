import { insertContent } from "../commands/index.ts";
import { resolveFromTo } from "../helpers/resolveFromTo.ts";
import type { Extension, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    bold: {
      /**
       * Wraps the selection or range in `**`, or inserts `**content**` when
       * `content` is given.
       * @param options - Optional content to wrap, and the position or range.
       * @returns False when the range is already bold.
       */
      setBold: (options?: { content?: string; pos?: PosOrRange }) => ReturnType;

      /**
       * Removes bold syntax from the given position or range, otherwise the current selection.
       * @param options An object containing the position or range to remove bold syntax from.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      removeBold: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Toggles bold syntax for the given position or range, otherwise the current selection.
       * If the content is already bold, it will be unbolded; otherwise, it will be wrapped in bold syntax.
       * @param options An object containing the position or range to toggle bold syntax for.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      toggleBold: (options?: { pos?: PosOrRange }) => ReturnType;
    };
  }
}

const isAlreadyBold = (text: string) => /^(\*\*|__)((?:(?!\*\*|__)[\s\S])*)\1$/.exec(text);

export const BoldExtension: Extension = {
  name: "bold",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "StrongEmphasis",
        className: "inksane-mark-bold",
        hideSyntax: true,
      },
    ];
  },

  addStateQueries() {
    return [{ name: "bold", nodeNames: ["StrongEmphasis"] }];
  },

  addHtmlConverters() {
    return [
      {
        match: (element) => ["strong", "b"].includes(element.tagName.toLowerCase()),
        toMarkdown: (element, { renderChildren }) => `**${renderChildren(element).trim()}**`,
      },
    ];
  },

  addCommands() {
    return {
      setBold: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);

        if (options?.content !== undefined) {
          return insertContent(ctx)({ content: `**${options.content}**`, from, to });
        }

        const selectedText = ctx.state.sliceDoc(from, to);

        if (isAlreadyBold(selectedText)) {
          return false;
        } else if (from === to) {
          ctx.dispatch({
            changes: { from, to, insert: "****" },
            selection: { anchor: from + 2, head: from + 2 },
          });
          return true;
        } else {
          return insertContent(ctx)({ content: `**${selectedText}**`, from, to });
        }
      },

      removeBold: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);
        const match = isAlreadyBold(selectedText);

        if (!match) {
          return false;
        } else {
          return insertContent(ctx)({ content: match[2], from, to });
        }
      },

      toggleBold: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);

        if (isAlreadyBold(selectedText)) {
          return ctx.editor.commands.removeBold({ pos: { from, to } });
        } else {
          return ctx.editor.commands.setBold({ pos: { from, to } });
        }
      },
    };
  },

  addKeybinds(ctx) {
    return [
      {
        key: "Mod-b",
        run() {
          return ctx.editor.commands.toggleBold();
        },
      },
    ];
  },
};
