import type { NamedCommand } from "~/types/commands.ts";

declare module "@inkwell/core" {
  interface Commands<ReturnType> {
    /**
     * Inserts content into the document at the specified range.
     * If to is not provided, it will insert at the from position.
     *
     * @param args.content The content to insert.
     * @param args.from The start position to insert the content.
     * @param args.to The end position to insert the content. If not provided, it will insert at the from position.
     * @returns A boolean indicating whether the command was executed successfully.
     */
    insertContent: {
      insertContent: (args: { content: string; from: number; to?: number }) => ReturnType;
    };
  }
}

/**
 * Inserts content into the document at the specified range.
 * @param ctx The command context.
 * @returns A boolean indicating whether the command was executed successfully.
 */
export const insertContent: NamedCommand<"insertContent"> =
  ({ dispatch }) =>
  ({ content, from, to }) => {
    dispatch({
      changes: { from, to, insert: content },
    });
    return true;
  };
