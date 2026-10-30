import { inlineMarkSyntax } from "../helpers/inlineMarkSyntax.ts";
import { toggleInlineMark } from "../helpers/toggleInlineMark.ts";
import type { Extension, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    superscript: {
      /**
       * Toggles superscript around the selection, or inserts an empty pair at the caret.
       * @param options - Optional position or range. Defaults to the selection.
       */
      toggleSuperscript: (options?: { pos?: PosOrRange }) => ReturnType;
    };
  }
}

/** Adds opt-in `^text^` syntax, decorations, commands, and HTML pasting. */
export const SuperscriptExtension: Extension = {
  name: "superscript",
  addMarkdownSyntax() {
    return [inlineMarkSyntax("Superscript", "^")];
  },
  addMarkdownDecorations() {
    return [{ nodeName: "Superscript", className: "inksane-mark-superscript", hideSyntax: true }];
  },
  addStateQueries() {
    return [{ name: "superscript", nodeNames: ["Superscript"] }];
  },
  addHtmlConverters() {
    return [
      {
        match: (element) => element.tagName.toLowerCase() === "sup",
        toMarkdown: (element, { renderChildren }) => `^${renderChildren(element).trim()}^`,
      },
    ];
  },
  addCommands() {
    return {
      toggleSuperscript: (ctx) => (options) =>
        toggleInlineMark(ctx, "Superscript", "^", options?.pos),
    };
  },
};
