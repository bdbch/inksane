import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import { insertContent } from "../commands/index.ts";
import type { InkwellExtension, MarkupRange, PosOrRange } from "../types/index.ts";

declare module "@inkwell/core" {
  interface Commands<ReturnType> {
    heading: {
      /**
       * Sets the heading level of the line containing the given position or range, otherwise the current selection.
       * @param options An object containing the heading level, and optionally the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      setHeading: (options: { level: number; pos?: PosOrRange }) => ReturnType;

      /**
       * Toggles the heading level of the line containing the given position or range, otherwise the current selection.
       * If the line is already a heading of that level, it will be converted back to a paragraph; otherwise, it will be set to the given level.
       * @param options An object containing the heading level, and optionally the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      toggleHeading: (options: { level: number; pos?: PosOrRange }) => ReturnType;

      /**
       * Removes heading syntax from the line containing the given position or range, otherwise the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      removeHeading: (options?: { pos?: PosOrRange }) => ReturnType;
    };
  }
}

const headingMarker = (level: number) => "#".repeat(level);

const getHeadingLevel = (text: string): number | null => {
  const match = /^(#{1,6})(\s|$)/.exec(text);
  return match ? match[1].length : null;
};

const stripHeading = (text: string) => text.replace(/^#+\s?/, "");

/** Hides the `#` markers and the whitespace between them and the heading content. */
const hideHeadingMarkup = (node: SyntaxNode, state: EditorState): MarkupRange[] => {
  const mark = node.getChild("HeaderMark");
  if (!mark) return [];

  let to = mark.to;
  while (to < node.to && /[ \t]/.test(state.doc.sliceString(to, to + 1))) to += 1;

  return [{ from: mark.from, to }];
};

const resolveFromTo = (state: EditorState, pos?: PosOrRange): { from: number; to: number } => {
  const from = typeof pos === "number" ? pos : (pos?.from ?? state.selection.main.from);
  const to = typeof pos === "number" ? pos : (pos?.to ?? state.selection.main.to);
  return { from, to };
};

export const HeadingExtension: InkwellExtension = {
  name: "heading",

  addMarkdownDecorations() {
    return Array.from({ length: 6 }, (_, i) => ({
      nodeName: `ATXHeading${i + 1}`,
      className: `inkwell-mark-heading inkwell-heading-${i + 1}`,
      hideSyntax: true,
      markup: hideHeadingMarkup,
    }));
  },

  addCommands() {
    return {
      setHeading: (ctx) => (options) => {
        const { level, pos } = options;
        if (level < 1 || level > 6) return false;

        const { from } = resolveFromTo(ctx.state, pos);
        const line = ctx.state.doc.lineAt(from);

        if (getHeadingLevel(line.text) === level) return false;

        const content = `${headingMarker(level)} ${stripHeading(line.text)}`;
        return insertContent(ctx)({ content, from: line.from, to: line.to });
      },

      removeHeading: (ctx) => (options) => {
        const { from } = resolveFromTo(ctx.state, options?.pos);
        const line = ctx.state.doc.lineAt(from);
        const content = stripHeading(line.text);

        if (content === line.text) return false;

        return insertContent(ctx)({ content, from: line.from, to: line.to });
      },

      toggleHeading: (ctx) => (options) => {
        const { level, pos } = options;
        if (level < 1 || level > 6) return false;

        const { from } = resolveFromTo(ctx.state, pos);
        const line = ctx.state.doc.lineAt(from);

        if (getHeadingLevel(line.text) === level) {
          return ctx.editor.commands.removeHeading({ pos: { from: line.from, to: line.to } });
        }

        const content = `${headingMarker(level)} ${stripHeading(line.text)}`;
        return insertContent(ctx)({ content, from: line.from, to: line.to });
      },
    };
  },
};
