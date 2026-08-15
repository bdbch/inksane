import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "./Editor.ts";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

function createEditor() {
  const mount = document.createElement("div");
  const editor = new Editor({ element: mount });
  return editor;
}

describe("Editor", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createEditor();
  });

  afterEach(() => {
    if (editor) {
      editor.view.dom.parentElement?.remove();
      editor.destroy();
    }
  });

  it("creates the editor and mounts the dom", () => {
    expect(editor).toBeDefined();
    expect(editor).toBeInstanceOf(Editor);
  });

  it("correctly creates the view and state", () => {
    const mount = document.createElement("div");
    const editor = new Editor({ element: mount });

    expect(editor.state).toBeInstanceOf(EditorState);
    expect(editor.view).toBeInstanceOf(EditorView);
    expect(editor.view.state).toBe(editor.state);
  });

  it("decorates Markdown bold syntax", () => {
    const mount = document.createElement("div");
    const editor = new Editor({ element: mount, content: "**bold**" });

    expect(editor.view.dom.querySelector(".inksane-mark-bold")?.textContent).toBe("**bold**");

    editor.destroy();
  });
});
