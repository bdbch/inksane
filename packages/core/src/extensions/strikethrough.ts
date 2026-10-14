import { Strikethrough } from "@lezer/markdown";
import { insertContent } from "../commands/index.ts";
import { getStrikeRange } from "../helpers/getStrikeRange.ts";
import { resolveFromTo } from "../helpers/resolveFromTo.ts";
import type { NamedCommand } from "../types/commands.ts";
import type { Extension, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    strikethrough: {
      /**
       * Wraps the selection in `~~`. At a caret, inserts `~~~~` with the caret inside.
       * @param options - Optional position or range. Defaults to the selection.
       * @returns False when the range is already struck through.
       */
      setStrike: (options?: { pos?: PosOrRange }) => ReturnType;
      /**
       * Removes the strikethrough enclosing the selection or caret.
       * @param options - Optional position or range. Defaults to the selection.
       * @returns False when no strikethrough encloses the range.
       */
      removeStrike: (options?: { pos?: PosOrRange }) => ReturnType;
      /**
       * Adds strikethrough or removes it around the selection or caret.
       * @param options - Optional position or range. Defaults to the selection.
       */
      toggleStrike: (options?: { pos?: PosOrRange }) => ReturnType;
    };
  }
}

/** Adds GFM strikethrough syntax, decorations, HTML pasting, and Mod-Shift-x. */
export const StrikethroughExtension: Extension = {
  name: "strikethrough",

  addMarkdownSyntax() {
    return [Strikethrough];
  },

  addMarkdownDecorations() {
    return [
      { nodeName: "Strikethrough", className: "inksane-mark-strikethrough", hideSyntax: true },
    ];
  },

  addStateQueries() {
    return [{ name: "strikethrough", nodeNames: ["Strikethrough"] }];
  },

  addHtmlConverters() {
    return [
      {
        match: (element) => ["del", "s"].includes(element.tagName.toLowerCase()),
        toMarkdown: (element, { renderChildren }) => `~~${renderChildren(element).trim()}~~`,
      },
    ];
  },

  addCommands() {
    const setStrike: NamedCommand<"setStrike"> = (ctx) => (options) => {
      const { from, to } = resolveFromTo(ctx.state, options?.pos);
      if (getStrikeRange(ctx.state, from, to)) return false;

      if (from === to) {
        ctx.dispatch({
          changes: { from, to, insert: "~~~~" },
          selection: { anchor: from + 2 },
        });
        return true;
      }
      return insertContent(ctx)({ content: `~~${ctx.state.sliceDoc(from, to)}~~`, from, to });
    };

    const removeStrike: NamedCommand<"removeStrike"> = (ctx) => (options) => {
      const { from, to } = resolveFromTo(ctx.state, options?.pos);
      const range = getStrikeRange(ctx.state, from, to);
      if (!range) return false;

      ctx.dispatch({
        changes: [
          { from: range.from, to: range.from + 2 },
          { from: range.to - 2, to: range.to },
        ],
      });
      return true;
    };

    return {
      setStrike,
      removeStrike,
      toggleStrike: (ctx) => (options) => removeStrike(ctx)(options) || setStrike(ctx)(options),
    };
  },

  addKeybinds(ctx) {
    return [{ key: "Mod-Shift-x", run: () => ctx.editor.commands.toggleStrike() }];
  },
};
