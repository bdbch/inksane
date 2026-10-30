import { inlineMarkSyntax } from "../helpers/inlineMarkSyntax.ts";
import { toggleInlineMark } from "../helpers/toggleInlineMark.ts";
import type { Extension, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    highlight: {
      /**
       * Toggles highlight around the selection, or inserts an empty pair at the caret.
       * @param options - Optional position or range. Defaults to the selection.
       */
      toggleHighlight: (options?: { pos?: PosOrRange }) => ReturnType;
    };
  }
}

/** Adds opt-in `==text==` syntax, decorations, commands, and HTML pasting. */
export const HighlightExtension: Extension = {
  name: "highlight",
  addMarkdownSyntax() {
    return [inlineMarkSyntax("Highlight", "==")];
  },
  addMarkdownDecorations() {
    return [{ nodeName: "Highlight", className: "inksane-mark-highlight", hideSyntax: true }];
  },
  addStateQueries() {
    return [{ name: "highlight", nodeNames: ["Highlight"] }];
  },
  addHtmlConverters() {
    return [
      {
        match: (element) => element.tagName.toLowerCase() === "mark",
        toMarkdown: (element, { renderChildren }) => `==${renderChildren(element)}==`,
      },
    ];
  },
  addCommands() {
    return {
      toggleHighlight: (ctx) => (options) => toggleInlineMark(ctx, "Highlight", "==", options?.pos),
    };
  },
};
