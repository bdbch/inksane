import type { EditorState } from "@codemirror/state";
import { insertContent } from "../commands/index.ts";
import { markRangesWithWhitespace } from "../helpers/markup.ts";
import type { InkwellExtension, PosOrRange } from "../types/index.ts";

declare module "@inkwell/core" {
  interface Commands<ReturnType> {
    blockquote: {
      /**
       * Adds blockquote syntax to the line containing the given position or range, otherwise the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      setBlockquote: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Removes blockquote syntax from the line containing the given position or range, otherwise the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      removeBlockquote: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Toggles blockquote syntax for the line containing the given position or range, otherwise the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      toggleBlockquote: (options?: { pos?: PosOrRange }) => ReturnType;
    };
  }
}

const getQuoteMark = (text: string) => /^>\s?/.exec(text);

const resolveFromTo = (state: EditorState, pos?: PosOrRange): { from: number; to: number } => {
  const from = typeof pos === "number" ? pos : (pos?.from ?? state.selection.main.from);
  const to = typeof pos === "number" ? pos : (pos?.to ?? state.selection.main.to);
  return { from, to };
};

export const BlockquoteExtension: InkwellExtension = {
  name: "blockquote",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "Blockquote",
        className: "inkwell-blockquote",
        hideSyntax: true,
        markup: (node, state) => markRangesWithWhitespace(node, state, "QuoteMark"),
      },
    ];
  },

  addCommands() {
    return {
      setBlockquote: (ctx) => (options) => {
        const { from } = resolveFromTo(ctx.state, options?.pos);
        const line = ctx.state.doc.lineAt(from);

        if (getQuoteMark(line.text)) return false;

        return insertContent(ctx)({ content: `> ${line.text}`, from: line.from, to: line.to });
      },

      removeBlockquote: (ctx) => (options) => {
        const { from } = resolveFromTo(ctx.state, options?.pos);
        const line = ctx.state.doc.lineAt(from);

        if (!getQuoteMark(line.text)) return false;

        return insertContent(ctx)({
          content: line.text.replace(/^>\s?/, ""),
          from: line.from,
          to: line.to,
        });
      },

      toggleBlockquote: (ctx) => (options) => {
        const { from } = resolveFromTo(ctx.state, options?.pos);
        const line = ctx.state.doc.lineAt(from);

        if (getQuoteMark(line.text)) {
          return ctx.editor.commands.removeBlockquote({ pos: { from: line.from, to: line.to } });
        }

        return ctx.editor.commands.setBlockquote({ pos: { from: line.from, to: line.to } });
      },
    };
  },
};
