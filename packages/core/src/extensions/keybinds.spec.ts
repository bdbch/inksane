import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";

describe("select all", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({ element: document.createElement("div"), content: "hello world" });
  });

  afterEach(() => {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  });

  it("selects the whole document on Mod-a", () => {
    editor.view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true }),
    );

    const { from, to } = editor.state.selection.main;
    expect(from).toBe(0);
    expect(to).toBe(editor.content.length);
  });
});
