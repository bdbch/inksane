import { insertContent } from "../commands/index.ts";
import { markRangesWithWhitespace } from "../helpers/markup.ts";
import { resolveFromTo } from "../helpers/resolveFromTo.ts";
import type { InkwellExtension, PosOrRange } from "../types/index.ts";

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

const isValidHeadingLevel = (level: number) => Number.isInteger(level) && level >= 1 && level <= 6;

const getHeadingLevel = (text: string): number | null => {
  const match = /^(#{1,6})(\s|$)/.exec(text);
  return match ? match[1].length : null;
};

const stripHeading = (text: string) => text.replace(/^#+\s?/, "");

export const HeadingExtension: InkwellExtension = {
  name: "heading",

  addMarkdownDecorations() {
    return Array.from({ length: 6 }, (_, i) => ({
      nodeName: `ATXHeading${i + 1}`,
      className: `inkwell-mark-heading inkwell-heading-${i + 1}`,
      hideSyntax: true,
      markup: (node, state) => markRangesWithWhitespace(node, state, "HeaderMark"),
    }));
  },

  addCommands() {
    return {
      setHeading: (ctx) => (options) => {
        const { level, pos } = options;
        if (!isValidHeadingLevel(level)) return false;

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
        if (!isValidHeadingLevel(level)) return false;

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
