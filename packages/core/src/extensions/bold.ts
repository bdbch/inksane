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
    };
  }
}

export const BoldExtension: InkwellExtension = {
  name: "bold",

  addCommands() {
    return {
      insertBold:
        (ctx) =>
        ({ content, pos }) => {
          const from = typeof pos === "number" ? pos : (pos?.from ?? ctx.state.selection.main.from);
          const to = typeof pos === "number" ? pos : (pos?.to ?? ctx.state.selection.main.to);

          return insertContent(ctx)({ content: `**${content}**`, from, to });
        },
    };
  },

  // TODO: find out how we implement the decorations for inline-syntax like bold, italic, etc.
  // also need to look into a way to hide syntax when focus is inside inline-syntax, so instead of "**bold**" we only show "bold"
};
