import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";

describe("image decorations", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "before\n![alt text](https://example.com/image.png)\nafter",
    });
  });

  afterEach(() => {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  });

  it("keeps the image visible while its syntax is selected", () => {
    const imageStart = editor.content.indexOf("![");
    editor.view.dispatch({ selection: { anchor: imageStart, head: imageStart + 1 } });

    expect(editor.view.dom.querySelector(".inksane-image")).not.toBeNull();
    expect(editor.view.dom.textContent).toContain("![alt text](https://example.com/image.png)");
  });

  it("renders the image between its syntax line and the next line", () => {
    const image = editor.view.dom.querySelector(".inksane-image");
    const lines = editor.view.dom.querySelectorAll(".cm-line");
    const afterLine = Array.from(lines).find((line) => line.textContent === "after");

    expect(image).not.toBeNull();
    expect(lines).toHaveLength(3);
    expect(image?.parentElement?.classList.contains("cm-line")).toBe(true);
    expect(
      image!.parentElement!.compareDocumentPosition(afterLine!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
