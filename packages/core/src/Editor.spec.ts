import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "./Editor.ts";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { LinkExtension } from "./extensions/link.ts";

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

  it("emits update when the document changes", () => {
    const editor = new Editor({ element: document.createElement("div") });
    let updates = 0;

    editor.on("update", () => {
      updates += 1;
    });

    editor.view.dispatch({ changes: { from: 0, insert: "hi" } });

    expect(updates).toBe(1);

    editor.destroy();
  });

  it("emits selectionUpdate when the selection changes", () => {
    const editor = new Editor({ element: document.createElement("div"), content: "hello" });
    const ranges: Array<{ from: number; to: number }> = [];

    editor.on("selectionUpdate", ({ selection }) => {
      ranges.push({ from: selection.main.from, to: selection.main.to });
    });

    editor.view.dispatch({ selection: { anchor: 1, head: 4 } });

    expect(ranges).toEqual([{ from: 1, to: 4 }]);

    editor.destroy();
  });

  it("lets a configured extension replace the built-in with the same name", () => {
    const mount = document.createElement("div");
    const editor = new Editor({
      element: mount,
      content: "hello",
      extensions: [LinkExtension({ onLinkRequest: () => "https://example.com" })],
    });

    editor.view.dispatch({ selection: { anchor: 0, head: 5 } });
    editor.view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
    );

    expect(editor.content).toBe("[hello](https://example.com)");

    editor.destroy();
  });
});
