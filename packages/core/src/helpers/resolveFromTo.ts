import type { EditorState } from "@codemirror/state";
import type { PosOrRange } from "../types/index.ts";

/** Resolves a position or range, falling back to the current selection. */
export const resolveFromTo = (
  state: EditorState,
  pos?: PosOrRange,
): { from: number; to: number } => {
  const from = typeof pos === "number" ? pos : (pos?.from ?? state.selection.main.from);
  const to = typeof pos === "number" ? pos : (pos?.to ?? state.selection.main.to);
  return { from, to };
};
