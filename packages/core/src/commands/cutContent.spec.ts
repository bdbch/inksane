import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";

describe("cutContent", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({ element: document.createElement("div"), content: "abcdef" });
  });

  afterEach(() => {
    editor.destroy();
  });

  it("moves content from one range to another when the source comes first", () => {
    expect(editor.commands.cutContent({ from: 0, to: 2 }, { from: 4, to: 5 })).toBe(true);
    expect(editor.content).toBe("cdabf");
  });

  it("moves content from one range to another when the target comes first", () => {
    expect(editor.commands.cutContent({ from: 4, to: 6 }, { from: 0, to: 2 })).toBe(true);
    expect(editor.content).toBe("efcd");
  });
});
