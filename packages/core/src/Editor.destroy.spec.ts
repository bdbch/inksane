import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { ViewPlugin } from "@codemirror/view";
import { Editor } from "./Editor.ts";

describe("Editor.destroy", () => {
  const editors: Editor[] = [];

  function createEditor(element?: HTMLElement) {
    const editor = new Editor({ element, content: "pending content" });
    editors.push(editor);
    return editor;
  }

  afterEach(() => {
    for (const editor of editors.splice(0)) editor.destroy();
  });

  it("releases the view, DOM references, listeners, and pending state", () => {
    const element = document.createElement("div");
    const editor = createEditor(element);
    const view = editor.view;
    const destroy = vi.fn();
    const unmount = vi.fn(() => expect(editor.view).toBe(view));
    const update = vi.fn();
    editor.on("destroy", destroy);
    editor.on("unmount", unmount);
    editor.on("update", update);

    editor.destroy();

    expect(editor.isMounted).toBe(false);
    expect(element.childElementCount).toBe(0);
    for (const node of [element, view.dom, view.contentDOM]) {
      expect("editor" in node).toBe(false);
    }
    expect(editor.options.element).toBeUndefined();
    expect(() => editor.state).toThrow("Editor is destroyed.");
    expect(unmount).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);

    editor.emit("update", { editor, transaction: view.state.update() });
    editor.emit("destroy", { editor });
    expect(update).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("destroys view plugins and emits lifecycle events only once", () => {
    const pluginDestroy = vi.fn();
    const editor = new Editor({
      element: document.createElement("div"),
      extensions: [
        {
          name: "teardown",
          addCodeMirrorExtensions: () => [ViewPlugin.define(() => ({ destroy: pluginDestroy }))],
        },
      ],
    });
    editors.push(editor);
    const events: string[] = [];
    editor.on("unmount", () => {
      events.push("unmount");
      if (events.length === 1) editor.destroy();
    });
    editor.on("destroy", () => events.push("destroy"));

    editor.destroy();
    editor.destroy();

    expect(events).toEqual(["unmount", "destroy"]);
    expect(pluginDestroy).toHaveBeenCalledTimes(1);
  });

  it("destroys a detached editor and prevents mounting it later", () => {
    const editor = createEditor();
    const destroy = vi.fn();
    editor.on("destroy", destroy);

    editor.destroy();
    editor.destroy();
    editor.mount(document.createElement("div"));

    expect(editor.isMounted).toBe(false);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(() => editor.state).toThrow("Editor is destroyed.");
  });

  it("lets a fresh editor mount on the same element", () => {
    const element = document.createElement("div");
    const first = createEditor(element);
    const oldView = first.view;
    first.destroy();
    const second = createEditor(element);
    first.destroy();

    expect(element).toHaveProperty("editor", second);
    expect(second.view.dom).toHaveProperty("editor", second);
    expect(second.view.contentDOM).toHaveProperty("editor", second);
    expect(element.contains(second.view.dom)).toBe(true);
    expect(oldView.dom).not.toHaveProperty("editor");
    expect(oldView.contentDOM).not.toHaveProperty("editor");
  });

  it("preserves another editor's reference on a shared mount element", () => {
    const element = document.createElement("div");
    const first = createEditor(element);
    const second = createEditor(element);

    first.destroy();

    expect(element).toHaveProperty("editor", second);
    expect(element.contains(second.view.dom)).toBe(true);
  });

  const lifecycleEvents: Array<"unmount" | "destroy"> = ["unmount", "destroy"];
  it.each(lifecycleEvents)("finishes cleanup when a %s listener throws", (event) => {
    const element = document.createElement("div");
    const editor = createEditor(element);
    const view = editor.view;
    editor.on(event, () => {
      throw new Error("listener failed");
    });

    expect(() => editor.destroy()).toThrow("listener failed");

    expect(editor.isMounted).toBe(false);
    expect(element.childElementCount).toBe(0);
    for (const node of [element, view.dom, view.contentDOM]) {
      expect("editor" in node).toBe(false);
    }
    expect(editor.options.element).toBeUndefined();
    expect(() => editor.state).toThrow("Editor is destroyed.");
    expect(() => editor.emit(event, { editor })).not.toThrow();
    expect(() => editor.destroy()).not.toThrow();
  });
});
