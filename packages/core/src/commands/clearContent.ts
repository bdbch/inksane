import type { NamedCommand } from "~/types/commands.ts";
import { deleteContent } from "./deleteContent.ts";

declare module "@inkwell/core" {
  interface Commands<ReturnType> {
    clearContent: {
      /**
       * Clears all content from the document.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      clearContent: () => ReturnType;
    };
  }
}

export const clearContent: NamedCommand<"clearContent"> = (ctx) => () => {
  return deleteContent(ctx)(0, ctx.state.doc.length);
};
