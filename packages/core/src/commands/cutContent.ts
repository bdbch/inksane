import type { NamedCommand } from "../types/commands.ts";

declare module "@inkwell/core" {
  interface Commands<ReturnType> {
    cutContent: {
      /**
       * Cuts content from one range and inserts it at another range
       * @param fromRange The range to cut from
       * @param toRange The range to insert to
       * @returns true if the operation was successful
       */
      cutContent: (
        fromRange: { from: number; to: number },
        toRange: { from: number; to: number },
      ) => boolean;
    };
  }
}

export const cutContent: NamedCommand<"cutContent"> =
  ({ state, dispatch }) =>
  (fromRange, toRange) => {
    try {
      const slicedContent = state.doc.sliceString(fromRange.from, fromRange.to);

      dispatch({
        changes: [
          { from: fromRange.from, to: fromRange.to, insert: "" },
          {
            from: toRange.from + slicedContent.length,
            to: toRange.to + slicedContent.length,
            insert: slicedContent,
          },
        ],
      });

      return true;
    } catch (error) {
      console.warn("[inkwell] Failed to cut content", fromRange, toRange, error);
      return false;
    }
  };
