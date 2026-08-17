import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";

describe("image decorations", () => {
  let editor: Editor;

  beforeEach(() => {
    const element = document.createElement("div");
    document.body.append(element);
    editor = new Editor({
      element,
      content: "before\n![alt text](https://example.com/image.png)\nafter",
    });
  });

  afterEach(() => {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  });

  it("keeps the image visible while its syntax is selected", () => {
    const imageStart = editor.content.indexOf("![");
    editor.view.focus();
    editor.view.dispatch({ selection: { anchor: imageStart, head: imageStart + 1 } });

    expect(editor.view.dom.querySelector(".inksane-image")).not.toBeNull();
    expect(editor.view.dom.textContent).toContain("![alt text](https://example.com/image.png)");
    expect(editor.view.dom.querySelectorAll(".cm-line")).toHaveLength(4);
  });

  it("replaces inactive image syntax inline", () => {
    const image = editor.view.dom.querySelector(".inksane-image");
    const lines = editor.view.dom.querySelectorAll(".cm-line");

    expect(image).not.toBeNull();
    expect(lines).toHaveLength(3);
    expect(editor.view.dom.textContent).not.toContain("![alt text](https://example.com/image.png)");
  });

  it("preserves text surrounding an inline image", () => {
    editor.view.dispatch({
      changes: { from: 0, to: editor.content.length, insert: "before ![alt](image.png) after" },
    });

    expect(editor.view.dom.querySelectorAll(".inksane-image")).toHaveLength(1);
    expect(editor.view.dom.textContent).toContain("before");
    expect(editor.view.dom.textContent).toContain("after");
  });

  it("renders an edited inline image below its source line", () => {
    const content = "before ![alt](image.png) after";
    editor.view.dispatch({ changes: { from: 0, to: editor.content.length, insert: content } });
    const imageStart = content.indexOf("![");
    editor.view.focus();
    editor.view.dispatch({ selection: { anchor: imageStart, head: imageStart + 1 } });

    expect(editor.view.dom.querySelectorAll(".inksane-image")).toHaveLength(1);
    expect(editor.view.dom.querySelectorAll(".cm-line")).toHaveLength(2);
    expect(editor.view.dom.textContent).toContain(content);
  });

  it("hides selected image syntax when the editor is blurred", () => {
    const imageStart = editor.content.indexOf("![");
    editor.view.focus();
    editor.view.dispatch({ selection: { anchor: imageStart, head: imageStart + 1 } });

    expect(editor.focused).toBe(true);
    expect(editor.view.dom.textContent).toContain("![alt text](https://example.com/image.png)");

    editor.view.contentDOM.blur();

    expect(editor.focused).toBe(false);
    expect(editor.view.dom.textContent).not.toContain("![alt text](https://example.com/image.png)");
    expect(editor.view.dom.querySelector(".inksane-image")).not.toBeNull();
    expect(editor.view.dom.querySelectorAll(".cm-line")).toHaveLength(3);
  });

  it("renders multiple inline images without overlapping replacements", () => {
    const content = "![first](one.png) and ![second](two.png)";
    editor.view.dispatch({ changes: { from: 0, to: editor.content.length, insert: content } });
    const betweenImages = content.indexOf("and");
    editor.view.dispatch({ selection: { anchor: betweenImages, head: betweenImages } });

    expect(editor.view.dom.querySelectorAll(".inksane-image")).toHaveLength(2);
    expect(editor.view.dom.textContent).toContain("and");
  });
});
