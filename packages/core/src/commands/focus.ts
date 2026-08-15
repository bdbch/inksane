import type { NamedCommand } from "../types/commands.ts";

declare module "@inksane/core" {
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
 * Scrolls the editor into view and focuses it.
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
      console.warn("[inksane] Failed to focus editor", error);
      return false;
    }
  };
