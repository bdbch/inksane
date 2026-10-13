import { afterEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";

const queryPlaceholder = (editor: Editor) =>
  editor.view.dom.querySelector<HTMLElement>(".cm-line.inksane-placeholder");

describe("placeholder", () => {
  let editor: Editor | undefined;

  afterEach(() => {
    if (editor) {
      editor.view.dom.parentElement?.remove();
      editor.destroy();
      editor = undefined;
    }
  });

  it("marks the empty line with the placeholder text", () => {
    editor = new Editor({ element: document.createElement("div"), placeholder: "Start writing…" });

    expect(queryPlaceholder(editor)?.getAttribute("data-inksane-placeholder")).toBe(
      "Start writing…",
    );
  });

  it("hides the placeholder as soon as content exists", () => {
    editor = new Editor({ element: document.createElement("div"), placeholder: "Start writing…" });
    expect(queryPlaceholder(editor)).not.toBeNull();

    editor.content = "hello";

    expect(queryPlaceholder(editor)).toBeNull();
  });

  it("shows the placeholder again when the document is cleared", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "hello",
      placeholder: "Start writing…",
    });
    expect(queryPlaceholder(editor)).toBeNull();

    editor.content = "";

    expect(queryPlaceholder(editor)).not.toBeNull();
  });

  it("renders no placeholder without the option", () => {
    editor = new Editor({ element: document.createElement("div") });

    expect(queryPlaceholder(editor)).toBeNull();
  });

  it("treats an empty placeholder as no placeholder", () => {
    editor = new Editor({ element: document.createElement("div"), placeholder: "" });

    expect(queryPlaceholder(editor)).toBeNull();
  });
});
