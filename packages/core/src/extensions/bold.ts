import type { EditorState } from "@codemirror/state";
import { insertContent } from "../commands/index.ts";
import type { InkwellExtension, PosOrRange } from "../types/index.ts";

declare module "@inkwell/core" {
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

const isAlreadyBold = (text: string) => /^(\*\*|__)([\s\S]*)\1$/.exec(text);

const resolveFromTo = (state: EditorState, pos?: PosOrRange): { from: number; to: number } => {
  const from = typeof pos === "number" ? pos : (pos?.from ?? state.selection.main.from);
  const to = typeof pos === "number" ? pos : (pos?.to ?? state.selection.main.to);
  return { from, to };
};

export const BoldExtension: InkwellExtension = {
  name: "bold",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "StrongEmphasis",
        className: "inkwell-mark-bold",
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
};
