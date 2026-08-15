import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vite-plus/test";
import { indentLines } from "./indent.ts";

function indentWithSelection(content: string, from: number, to: number): string {
  const state = EditorState.create({ doc: content, selection: { anchor: from, head: to } });
  const spec = indentLines(state, 1, "  ");
  if (!spec) return content;
  const { state: next } = state.update(spec);
  return next.doc.toString();
}

describe("indentLines", () => {
  it("indents the starting line when the selection starts mid-line", () => {
    const content = "line one\nline two\nline three";
    const result = indentWithSelection(content, 4, 22);
    expect(result).toBe("  line one\n  line two\n  line three");
  });

  it("excludes the end line when the selection ends at its start", () => {
    const content = "one\ntwo\nthree";
    const result = indentWithSelection(content, 0, 4);
    expect(result).toBe("  one\ntwo\nthree");
  });
});
