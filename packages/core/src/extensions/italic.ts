import type { EditorState } from "@codemirror/state";
import { insertContent } from "../commands/index.ts";
import type { InkwellExtension, PosOrRange } from "../types/index.ts";

declare module "@inkwell/core" {
  interface Commands<ReturnType> {
    italic: {
      /**
       * Inserts italic syntax around the specified content in the document.
       * @param content The content to be wrapped in italic syntax.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      insertItalic: (options: { content: string; pos?: PosOrRange }) => ReturnType;

      /**
       * Wraps existing content with italic syntax at the specified position or range in the document, otherwise uses the current selection.
       * @param options An object containing the position or range to apply italic syntax to.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      setItalic: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Removes italic syntax from the specified position or range in the document, otherwise uses the current selection.
       * @param options An object containing the position or range to remove italic syntax from.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      removeItalic: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Toggles italic syntax for the specified position or range in the document, otherwise uses the current selection.
       * If the content is already italic, it will be unitalicized; otherwise, it will be wrapped in italic syntax.
       * @param options An object containing the position or range to toggle italic syntax for.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      toggleItalic: (options?: { pos?: PosOrRange }) => ReturnType;
    };
  }
}

const isBoldSyntax = (text: string) => /^(\*\*|__)([\s\S]*)\1$/.test(text);
const isAlreadyItalic = (text: string) => {
  if (isBoldSyntax(text)) return null;
  return /^(\*|_)([\s\S]*)\1$/.exec(text);
};

const resolveFromTo = (state: EditorState, pos?: PosOrRange): { from: number; to: number } => {
  const from = typeof pos === "number" ? pos : (pos?.from ?? state.selection.main.from);
  const to = typeof pos === "number" ? pos : (pos?.to ?? state.selection.main.to);
  return { from, to };
};

export const ItalicExtension: InkwellExtension = {
  name: "italic",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "Emphasis",
        className: "inkwell-mark-italic",
        hideSyntax: true,
      },
    ];
  },

  addCommands() {
    return {
      insertItalic:
        (ctx) =>
        ({ content, pos }) => {
          const { from, to } = resolveFromTo(ctx.state, pos);
          return insertContent(ctx)({ content: `_${content}_`, from, to });
        },

      setItalic: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);

        if (isAlreadyItalic(selectedText)) {
          return false;
        } else {
          return insertContent(ctx)({ content: `_${selectedText}_`, from, to });
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
};
