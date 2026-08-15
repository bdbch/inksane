import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";

describe("insertHorizontalRule", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({ element: document.createElement("div"), content: "hello" });
  });

  afterEach(() => {
    if (editor) {
      editor.view.dom.parentElement?.remove();
      editor.destroy();
    }
  });

  it("rejects a negative position", () => {
    expect(editor.commands.insertHorizontalRule({ pos: -1 })).toBe(false);
    expect(editor.content).toBe("hello");
  });

  it("rejects a reversed range", () => {
    expect(editor.commands.insertHorizontalRule({ pos: { from: 4, to: 1 } })).toBe(false);
    expect(editor.content).toBe("hello");
  });

  it("rejects positions beyond the end of the document", () => {
    expect(editor.commands.insertHorizontalRule({ pos: 100 })).toBe(false);
    expect(editor.commands.insertHorizontalRule({ pos: { from: 0, to: 100 } })).toBe(false);
    expect(editor.content).toBe("hello");
  });

  it("keeps working for valid ranges", () => {
    expect(editor.commands.insertHorizontalRule({ pos: { from: 0, to: 5 } })).toBe(true);
    expect(editor.content).toContain("---");
  });
});
