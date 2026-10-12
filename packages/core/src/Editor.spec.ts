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

  it("wraps long lines by default", () => {
    const mount = document.createElement("div");
    const editor = new Editor({ element: mount });

    expect(editor.view.contentDOM.classList.contains("cm-lineWrapping")).toBe(true);

    editor.destroy();
  });

  it("does not wrap long lines when lineWrapping is disabled", () => {
    const mount = document.createElement("div");
    const editor = new Editor({ element: mount, lineWrapping: false });

    expect(editor.view.contentDOM.classList.contains("cm-lineWrapping")).toBe(false);

    editor.destroy();
  });

  it("decorates Markdown bold syntax", () => {
    const mount = document.createElement("div");
    document.body.append(mount);
    const editor = new Editor({ element: mount, content: "**bold**" });
    editor.view.focus();

    expect(editor.view.dom.querySelector(".inksane-mark-bold")?.textContent).toBe("**bold**");

    editor.destroy();
    mount.remove();
  });

  it("creates a detached editor when no element is passed", () => {
    const editor = new Editor({ content: "# Hi" });

    expect(editor.isMounted).toBe(false);
    expect(editor.state).toBeInstanceOf(EditorState);
    expect(editor.content).toBe("# Hi");
  });

  it("throws when reading the view before mount", () => {
    const editor = new Editor({});

    expect(() => editor.view).toThrow();
  });

  it("mounts into an element after creation", () => {
    const mount = document.createElement("div");
    const editor = new Editor({ content: "# Hi" });

    editor.mount(mount);

    expect(editor.isMounted).toBe(true);
    expect(editor.view).toBeInstanceOf(EditorView);
    expect(mount.contains(editor.view.dom)).toBe(true);

    editor.destroy();
  });

  it("applies content set before mount", () => {
    const mount = document.createElement("div");
    const editor = new Editor({});

    editor.content = "# Later";
    editor.mount(mount);

    expect(editor.content).toBe("# Later");

    editor.destroy();
  });

  it("ignores a second mount", () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    const editor = new Editor({});

    editor.mount(first);
    editor.mount(second);

    expect(first.contains(editor.view.dom)).toBe(true);
    expect(second.contains(editor.view.dom)).toBe(false);

    editor.destroy();
  });

  it("detaches the view on destroy", () => {
    const editor = new Editor({ element: document.createElement("div") });

    editor.destroy();

    expect(editor.isMounted).toBe(false);
  });
});
