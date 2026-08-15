import { insertContent } from "../commands/index.ts";
import { resolveFromTo } from "../helpers/resolveFromTo.ts";
import type { Extension, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    bold: {
      /**
       * Inserts bold syntax around the specified content in the document.
       * @param content The content to be wrapped in bold syntax.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      insertBold: (options: { content: string; pos?: PosOrRange }) => ReturnType;

      /**
       * Wraps existing content with bold syntax at the specified position or range in the document, otherwise uses the current selection.
       * @param options An object containing the position or range to apply bold syntax to.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      setBold: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Removes bold syntax from the specified position or range in the document, otherwise uses the current selection.
       * @param options An object containing the position or range to remove bold syntax from.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      removeBold: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Toggles bold syntax for the specified position or range in the document, otherwise uses the current selection.
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

  addCommands() {
    return {
      insertBold:
        (ctx) =>
        ({ content, pos }) => {
          const { from, to } = resolveFromTo(ctx.state, pos);
          return insertContent(ctx)({ content: `**${content}**`, from, to });
        },

      setBold: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
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
