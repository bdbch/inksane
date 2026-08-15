import type { NamedCommand } from "../types/commands.ts";

declare module "@inkwell/core" {
  interface Commands<ReturnType> {
    /**
     * Focuses the editor view.
     * @returns A boolean indicating whether the command was executed successfully.
     */
    focus: {
      focus: () => ReturnType;
    };
  }
}

/**
 * Inserts content into the document at the specified range.
 * @param ctx The command context.
 * @returns A boolean indicating whether the command was executed successfully.
 */
export const focus: NamedCommand<"focus"> =
  ({ dispatch, view }) =>
  () => {
    try {
      dispatch({
        scrollIntoView: true,
      });

      view.focus();
      return true;
    } catch (error) {
      console.warn("[inkwell] Failed to focus editor", error);
      return false;
    }
  };
