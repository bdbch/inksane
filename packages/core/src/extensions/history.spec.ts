import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { undoDepth, redoDepth } from "@codemirror/commands";
import { Editor } from "../Editor.ts";

function press(editor: Editor, key: string, modifiers: KeyboardEventInit = {}) {
  editor.view.contentDOM.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, ...modifiers }),
  );
}

describe("history", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({ element: document.createElement("div"), content: "hello" });
  });

  afterEach(() => {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  });

  it("registers history in the default editor setup", () => {
    editor.view.dispatch({ changes: { from: 5, insert: " world" } });

    expect(undoDepth(editor.state)).toBeGreaterThan(0);
  });

  it("undoes with Mod-z and redoes with Mod-Shift-z", () => {
    editor.view.dispatch({ changes: { from: 5, insert: " world" } });
    expect(editor.content).toBe("hello world");

    press(editor, "z", { ctrlKey: true });
    expect(editor.content).toBe("hello");

    press(editor, "z", { ctrlKey: true, shiftKey: true });
    expect(editor.content).toBe("hello world");
  });

  it("redoes with Mod-y", () => {
    editor.view.dispatch({ changes: { from: 5, insert: " world" } });

    press(editor, "z", { ctrlKey: true });
    expect(editor.content).toBe("hello");

    press(editor, "y", { ctrlKey: true });
    expect(editor.content).toBe("hello world");
  });

  it("groups a burst of typing into one undo step", () => {
    const editor2 = new Editor({ element: document.createElement("div") });
    for (let i = 0; i < "hello".length; i++) {
      editor2.view.dispatch({ changes: { from: i, insert: "hello"[i] } });
    }
    expect(editor2.content).toBe("hello");

    press(editor2, "z", { ctrlKey: true });
    expect(editor2.content).toBe("");

    editor2.view.dom.parentElement?.remove();
    editor2.destroy();
  });

  it("undoes command-based changes", () => {
    editor.view.dispatch({ selection: { anchor: 0, head: 5 } });
    editor.chain().toggleBold().run();
    expect(editor.content).toBe("**hello**");

    press(editor, "z", { ctrlKey: true });
    expect(editor.content).toBe("hello");

    expect(redoDepth(editor.state)).toBeGreaterThan(0);
  });
});
