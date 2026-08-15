import { afterEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "./Editor.ts";

describe("CommandChain", () => {
  let editor: Editor;

  afterEach(() => {
    if (editor) {
      editor.view.dom.parentElement?.remove();
      editor.destroy();
    }
  });

  it("inserts a horizontal rule after a prior chain insertion, preserving positions and selection", () => {
    editor = new Editor({ element: document.createElement("div"), content: "" });

    const ok = editor
      .chain()
      .insertContent({ content: "before", from: 0, to: 0 })
      .insertHorizontalRule()
      .run();

    expect(ok).toBe(true);
    expect(editor.content).toBe("\n\n---\n\nbefore");
    const { from, to } = editor.view.state.selection.main;
    expect([from, to]).toEqual([7, 7]);
  });
});
