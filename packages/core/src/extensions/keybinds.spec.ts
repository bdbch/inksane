import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { searchPanelOpen } from "@codemirror/search";
import { Editor } from "../Editor.ts";
import { BaseKit } from "./baseKit.ts";

function press(editor: Editor, key: string, modifiers: KeyboardEventInit = {}) {
  editor.view.contentDOM.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, ...modifiers }),
  );
}

describe("select all", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "hello world",
      extensions: [BaseKit()],
    });
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
    editor = new Editor({
      element: document.createElement("div"),
      content: "hello world",
      extensions: [BaseKit()],
    });
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
    const lines = new Editor({ element: mount, content: "one\ntwo", extensions: [BaseKit()] });
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
    const tabbed = new Editor({
      element: mount,
      content: "a",
      tabSize: 4,
      extensions: [BaseKit()],
    });
    tabbed.view.dispatch({ selection: { anchor: 0 } });

    press(tabbed, "Tab");

    expect(tabbed.content).toBe("    a");

    mount.remove();
    tabbed.destroy();
  });
});

describe("list indentation", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "- one\n- two",
      extensions: [BaseKit()],
    });
  });

  afterEach(() => {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  });

  it("sinks the current list item on Tab", () => {
    editor.view.dispatch({ selection: { anchor: 6 } });

    press(editor, "Tab");

    expect(editor.content).toBe("- one\n  - two");
  });

  it("lifts the current list item on Shift-Tab", () => {
    editor.setMarkdown("- one\n  - two");
    editor.view.dispatch({ selection: { anchor: 8 } });

    press(editor, "Tab", { shiftKey: true });

    expect(editor.content).toBe("- one\n- two");
  });

  it("leaves the first item in place instead of inserting spaces", () => {
    editor.view.dispatch({ selection: { anchor: 0 } });

    press(editor, "Tab");

    expect(editor.content).toBe("- one\n- two");
  });

  it("sinks a multi-line list selection", () => {
    editor.setMarkdown("- one\n- two\n- three");
    editor.view.dispatch({ selection: { anchor: 6, head: editor.content.length } });

    press(editor, "Tab");

    expect(editor.content).toBe("- one\n  - two\n  - three");
  });
});

describe("newline input", () => {
  /** Loads content, puts the caret at the given position, and presses Enter. */
  const typeEnter = (content: string, anchor: number | "end", times = 1) => {
    const mount = document.createElement("div");
    const editor = new Editor({ element: mount, content, extensions: [BaseKit()] });
    editor.view.focus();
    editor.view.dispatch({
      selection: { anchor: anchor === "end" ? editor.content.length : anchor },
    });

    for (let i = 0; i < times; i++) press(editor, "Enter");

    const value = editor.content;
    mount.remove();
    editor.destroy();
    return value;
  };

  it("adds one newline per Enter press", () => {
    expect(typeEnter("hello", "end", 2)).toBe("hello\n\n");
  });

  it("adds consecutive newlines in the middle of a line", () => {
    expect(typeEnter("hello", 2, 2)).toBe("he\n\nllo");
  });

  it("adds consecutive newlines in an empty document", () => {
    expect(typeEnter("", "end", 2)).toBe("\n\n");
  });

  it("inserts a plain newline at the end of a bullet list item", () => {
    expect(typeEnter("- item", "end", 2)).toBe("- item\n\n");
  });

  it("inserts a plain newline at the end of an ordered list item", () => {
    expect(typeEnter("1. item", "end", 2)).toBe("1. item\n\n");
  });

  it("inserts a plain newline at the end of a blockquote", () => {
    expect(typeEnter("> quote", "end", 2)).toBe("> quote\n\n");
  });
});

describe("default keymap configuration", () => {
  it("can be disabled in BaseKit", () => {
    const mount = document.createElement("div");
    const editor = new Editor({ element: mount, extensions: [BaseKit({ defaultKeymap: false })] });

    press(editor, "f", { ctrlKey: true });

    expect(searchPanelOpen(editor.state)).toBe(false);

    mount.remove();
    editor.destroy();
  });

  it("can be replaced after disabling the kit's keymap", () => {
    const mount = document.createElement("div");
    const editor = new Editor({
      element: mount,
      extensions: [
        BaseKit({ defaultKeymap: false }),
        { name: "defaultKeymap", addKeybinds: () => [] },
      ],
    });

    press(editor, "f", { ctrlKey: true });

    expect(searchPanelOpen(editor.state)).toBe(false);

    mount.remove();
    editor.destroy();
  });
});

describe("extension keybinds", () => {
  it("runs a keybind added by an extension", () => {
    const mount = document.createElement("div");
    const editor = new Editor({
      element: mount,
      content: "hello",
      extensions: [
        {
          name: "customKeybind",
          addKeybinds: () => [
            {
              key: "Mod-j",
              run(view) {
                view.dispatch({ changes: { from: 0, insert: "x" } });
                return true;
              },
            },
          ],
        },
      ],
    });

    press(editor, "j", { ctrlKey: true });

    expect(editor.content).toBe("xhello");

    mount.remove();
    editor.destroy();
  });
});
