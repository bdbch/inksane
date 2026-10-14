import type { EditorState } from "@codemirror/state";
import { getActiveMarkRange } from "./stateQueries.ts";
import type { Range } from "../types/index.ts";

/** Finds strikethrough enclosing a range, including an empty pair at the caret. */
export function getStrikeRange(state: EditorState, from: number, to: number): Range | null {
  const range = getActiveMarkRange(
    state,
    [{ name: "strikethrough", nodeNames: ["Strikethrough"] }],
    "strikethrough",
    from,
  );
  if (range && to <= range.to && (from !== to || (range.from < from && from < range.to))) {
    return range;
  }

  // Empty markers have no syntax node until text is typed between them.
  if (
    from === to &&
    from >= 2 &&
    from + 2 <= state.doc.length &&
    state.sliceDoc(from - 2, from + 2) === "~~~~"
  ) {
    return { from: from - 2, to: from + 2 };
  }
  return null;
}
