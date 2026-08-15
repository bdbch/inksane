import type { NamedCommand } from "../types/commands.ts";

declare module "@inksane/core" {
  interface Commands {
    deleteContent: {
      /**
       * Deletes content from the document at the specified range.
       * @param from The start position to delete the content.
       * @param to The end position to delete the content.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      deleteContent: (from: number, to: number) => boolean;
    };
  }
}

export const deleteContent: NamedCommand<"deleteContent"> =
  ({ dispatch }) =>
  (from, to) => {
    try {
      dispatch({
        changes: { from, to, insert: "" },
      });

      return true;
    } catch (error) {
      console.warn("[inksane] Failed to delete content", from, to, error);
      return false;
    }
  };
