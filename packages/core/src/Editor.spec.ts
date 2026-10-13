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

  it("invokes extension lifecycle handlers and stops them after destroy", () => {
    const calls: string[] = [];
    const editor = new Editor({
      element: document.createElement("div"),
      extensions: [
        {
          name: "lifecycle",
          create: () => {
            calls.push("create");
          },
          destroy: () => {
            calls.push("destroy");
          },
        },
      ],
    });

    expect(calls).toEqual(["create"]);

    editor.destroy();
    editor.emit("create", { editor });

    expect(calls).toEqual(["create", "destroy"]);
  });

  it("passes { editor } and the event payload to lifecycle handlers", () => {
    const received: { ctx?: { editor: Editor }; payload?: unknown } = {};
    const editor = new Editor({
      element: document.createElement("div"),
      extensions: [
        {
          name: "payload",
          transaction: (ctx, payload) => {
            received.ctx = ctx;
            received.payload = payload;
          },
        },
      ],
    });

    const payload = { editor, transaction: editor.state.update({}) };
    editor.emit("transaction", payload);

    expect(received.ctx?.editor).toBe(editor);
    expect(received.payload).toBe(payload);
    editor.destroy();
  });

  it("calls higher priority extensions' lifecycle handlers first", () => {
    const calls: string[] = [];
    const editor = new Editor({
      element: document.createElement("div"),
      extensions: [
        { name: "low", priority: 1, create: () => void calls.push("low") },
        { name: "high", priority: 10, create: () => void calls.push("high") },
      ],
    });

    expect(calls).toEqual(["high", "low"]);
    editor.destroy();
  });

  it("calls mount handlers when a detached editor is mounted later", () => {
    const calls: string[] = [];
    const editor = new Editor({
      extensions: [{ name: "mounts", mount: () => void calls.push("mount") }],
    });

    expect(calls).toEqual([]);

    editor.mount(document.createElement("div"));

    expect(calls).toEqual(["mount"]);
    editor.destroy();
  });

  it("still removes listeners and destroys the view when a destroy handler throws", () => {
    const calls: string[] = [];
    const editor = new Editor({
      element: document.createElement("div"),
      extensions: [
        {
          name: "throws",
          destroy: () => {
            throw new Error("destroy failed");
          },
        },
        { name: "counter", create: () => void calls.push("create") },
      ],
    });

    expect(() => editor.destroy()).toThrow("destroy failed");
    expect(editor.isMounted).toBe(false);

    editor.emit("create", { editor });
    expect(calls).toEqual(["create"]);
  });

  it("still destroys the view and removes listeners when an unmount handler throws", () => {
    const calls: string[] = [];
    const editor = new Editor({
      element: document.createElement("div"),
      extensions: [
        {
          name: "throws",
          unmount: () => {
            throw new Error("unmount failed");
          },
        },
        { name: "counter", destroy: () => void calls.push("destroy") },
      ],
    });

    expect(() => editor.destroy()).toThrow("unmount failed");
    expect(editor.isMounted).toBe(false);

    editor.emit("destroy", { editor });
    expect(calls).toEqual([]);
  });
});
