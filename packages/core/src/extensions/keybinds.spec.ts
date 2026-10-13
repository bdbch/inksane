import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { searchPanelOpen } from "@codemirror/search";
import { Editor } from "../Editor.ts";

function press(editor: Editor, key: string, modifiers: KeyboardEventInit = {}) {
  editor.view.contentDOM.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, ...modifiers }),
  );
}

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
    press(editor, "a", { ctrlKey: true });

    const { from, to } = editor.state.selection.main;
    expect(from).toBe(0);
    expect(to).toBe(editor.content.length);
  });
});

describe("default keymap", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({ element: document.createElement("div"), content: "hello world" });
  });

  afterEach(() => {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  });

  it("deletes the previous word on Mod-Backspace", () => {
    editor.view.dispatch({ selection: { anchor: 11 } });

    press(editor, "Backspace", { ctrlKey: true });

    expect(editor.content).toBe("hello ");
  });

  it("moves the current line up on Alt-ArrowUp", () => {
    const mount = document.createElement("div");
    const lines = new Editor({ element: mount, content: "one\ntwo" });
    lines.view.dispatch({ selection: { anchor: 4 } });

    press(lines, "ArrowUp", { altKey: true });

    expect(lines.content).toBe("two\none");

    mount.remove();
    lines.destroy();
  });

  it("opens the search panel on Mod-f", () => {
    press(editor, "f", { ctrlKey: true });

    expect(searchPanelOpen(editor.state)).toBe(true);
  });

  it("keeps the editor's own Tab indentation, honoring tabSize", () => {
    const mount = document.createElement("div");
    const tabbed = new Editor({ element: mount, content: "a", tabSize: 4 });
    tabbed.view.dispatch({ selection: { anchor: 0 } });

    press(tabbed, "Tab");

    expect(tabbed.content).toBe("    a");

    mount.remove();
    tabbed.destroy();
  });
});

describe("default keymap configuration", () => {
  it("can be opted out of with defaultKeymap: false", () => {
    const mount = document.createElement("div");
    const editor = new Editor({ element: mount, defaultKeymap: false });

    press(editor, "f", { ctrlKey: true });

    expect(searchPanelOpen(editor.state)).toBe(false);

    mount.remove();
    editor.destroy();
  });

  it("can be replaced by a configured extension with the same name", () => {
    const mount = document.createElement("div");
    const editor = new Editor({
      element: mount,
      extensions: [{ name: "defaultKeymap", addKeybinds: () => [] }],
    });

    press(editor, "f", { ctrlKey: true });

    expect(searchPanelOpen(editor.state)).toBe(false);

    mount.remove();
    editor.destroy();
  });
});
