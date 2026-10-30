import { inlineMarkSyntax } from "../helpers/inlineMarkSyntax.ts";
import { toggleInlineMark } from "../helpers/toggleInlineMark.ts";
import type { Extension, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    subscript: {
      /**
       * Toggles subscript around the selection, or inserts an empty pair at the caret.
       * @param options - Optional position or range. Defaults to the selection.
       */
      toggleSubscript: (options?: { pos?: PosOrRange }) => ReturnType;
    };
  }
}

/** Adds opt-in `~text~` syntax, decorations, commands, and HTML pasting. */
export const SubscriptExtension: Extension = {
  name: "subscript",
  addMarkdownSyntax() {
    return [inlineMarkSyntax("Subscript", "~")];
  },
  addMarkdownDecorations() {
    return [{ nodeName: "Subscript", className: "inksane-mark-subscript", hideSyntax: true }];
  },
  addStateQueries() {
    return [{ name: "subscript", nodeNames: ["Subscript"] }];
  },
  addHtmlConverters() {
    return [
      {
        match: (element) => element.tagName.toLowerCase() === "sub",
        toMarkdown: (element, { renderChildren }) => `~${renderChildren(element)}~`,
      },
    ];
  },
  addCommands() {
    return {
      toggleSubscript: (ctx) => (options) => toggleInlineMark(ctx, "Subscript", "~", options?.pos),
    };
  },
};
