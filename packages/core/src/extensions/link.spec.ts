import { afterEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";

describe("link decorations", () => {
  let editor: Editor;

  const mount = (content: string) => {
    editor = new Editor({ element: document.createElement("div"), content });
  };

  afterEach(() => {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  });

  it("renders the open-link icon for a real, safe link", () => {
    mount("[text](https://example.com)");

    const anchor = editor.view.dom.querySelector(".inksane-mark-link-open");
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute("href")).toBe("https://example.com");
  });

  it("renders a relative open-link icon for a safe relative link", () => {
    mount("[text](/relative/path)");

    const anchor = editor.view.dom.querySelector(".inksane-mark-link-open");
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute("href")).toBe("/relative/path");
  });

  it("does not render an open-link icon for a link without a URL", () => {
    mount("[text]()");

    expect(editor.view.dom.querySelector(".inksane-mark-link-open")).toBeNull();
  });

  it("does not render an open-link icon for footnote references", () => {
    mount("see [^1] here");

    expect(editor.view.dom.querySelector(".inksane-mark-link-open")).toBeNull();
  });

  it("does not render an open-link icon for task checkboxes", () => {
    mount("- [x] task");

    expect(editor.view.dom.querySelector(".inksane-mark-link-open")).toBeNull();
  });

  it("does not render an open-link icon for wiki links", () => {
    mount("[[wiki link]]");

    expect(editor.view.dom.querySelector(".inksane-mark-link-open")).toBeNull();
  });

  it("does not render an open-link icon for an unsafe URL", () => {
    mount("[text](javascript:alert(1))");

    expect(editor.view.dom.querySelector(".inksane-mark-link-open")).toBeNull();
  });

  it("keeps the icon next to a real link when other links have no URL", () => {
    mount("[^1] and [text](https://example.com) and [x]");

    const anchors = editor.view.dom.querySelectorAll(".inksane-mark-link-open");
    expect(anchors).toHaveLength(1);
    expect(anchors[0]?.getAttribute("href")).toBe("https://example.com");
  });
});
