import { describe, expect, it } from "vite-plus/test";
import { Editor } from "./Editor.ts";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

describe("Editor", () => {
  it("creates the editor and mounts the dom", () => {
    const mount = document.createElement("div");
    const editor = new Editor({ element: mount });

    expect(editor).toBeDefined();
    expect(editor).toBeInstanceOf(Editor);
    expect(editor.view.dom.parentElement).toBe(mount);
  });

  it("correctly creates the view and state", () => {
    const mount = document.createElement("div");
    const editor = new Editor({ element: mount });

    expect(editor.state).toBeInstanceOf(EditorState);
    expect(editor.view).toBeInstanceOf(EditorView);
    expect(editor.view.state).toBe(editor.state);
  });
});
