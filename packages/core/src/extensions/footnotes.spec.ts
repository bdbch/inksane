import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import { BaseKit } from "./baseKit.ts";
import { FootnoteExtension } from "./footnotes.ts";
import { LinkExtension } from "./link.ts";

describe("footnotes", () => {
  const editors: Editor[] = [];
  const elements: HTMLElement[] = [];

  const mount = (content: string, extensions = [FootnoteExtension]) => {
    const element = document.createElement("div");
    document.body.append(element);
    elements.push(element);

    const editor = new Editor({ element, content, extensions });
    editors.push(editor);
    return editor;
  };

  let editor: Editor;

  beforeEach(() => {
    editor = mount("see [^1] here");
    editor.view.focus();
  });

  afterEach(() => {
    for (const instance of editors) instance.destroy();
    for (const element of elements) element.remove();
    editors.length = 0;
    elements.length = 0;
  });

  const findNode = (name: string): SyntaxNode | null => {
    let found: SyntaxNode | null = null;

    syntaxTree(editor.state).iterate({
      enter(node) {
        if (found) return false;
        if (node.name === name) found = node.node;
      },
    });

    return found;
  };

  const countNodes = (name: string): number => {
    let count = 0;

    syntaxTree(editor.state).iterate({
      enter(node) {
        if (node.name === name) count += 1;
      },
    });

    return count;
  };

  it("parses references and definitions as dedicated nodes", () => {
    editor.setMarkdown("see [^1] here\n\n[^1]: a note");

    expect(findNode("FootnoteReference")).not.toBeNull();
    expect(findNode("FootnoteDefinition")).not.toBeNull();
    expect(editor.getMarkdown()).toBe("see [^1] here\n\n[^1]: a note");
  });

  it("reports the reference and definition as active through state queries", () => {
    editor.setMarkdown("see [^1] here\n\n[^1]: a note");

    editor.view.dispatch({ selection: { anchor: 6 } });
    expect(editor.isActive("footnoteReference")).toBe(true);
    expect(editor.isActive("footnoteDefinition")).toBe(false);

    editor.view.dispatch({ selection: { anchor: editor.content.indexOf("[^1]: a note") } });
    expect(editor.isActive("footnoteDefinition")).toBe(true);
  });

  it("keeps consecutive definitions as separate decorated blocks", () => {
    editor.setMarkdown("intro\n\n[^1]: one\n[^2]: two\n[^3]: three");
    editor.view.dispatch({ selection: { anchor: 0 } });

    expect(countNodes("FootnoteDefinition")).toBe(3);
    expect(editor.view.contentDOM.querySelectorAll(".inksane-footnote-marker")).toHaveLength(3);
    expect(editor.view.contentDOM.textContent).toBe("intro1 one2 two3 three");

    editor.view.dispatch({ selection: { anchor: editor.state.doc.line(4).from + 3 } });

    expect(editor.view.contentDOM.querySelectorAll(".inksane-footnote-marker")).toHaveLength(2);
    expect(editor.view.contentDOM.textContent).toContain("[^2]: two");
  });

  it("does not turn a definition into a link reference definition", () => {
    editor.setMarkdown("[^1]: note");

    expect(countNodes("FootnoteDefinition")).toBe(1);
    expect(countNodes("LinkReference")).toBe(0);
    expect(editor.getMarkdown()).toBe("[^1]: note");
  });

  it("renders a reference as a superscript marker instead of raw brackets", () => {
    const reference = editor.view.contentDOM.querySelector(".inksane-footnote-ref");

    expect(reference).not.toBeNull();
    expect(reference?.textContent).toBe("1");
    expect(reference?.getAttribute("role")).toBe("doc-noteref");
    expect(editor.view.contentDOM.textContent).toBe("see 1 here");
  });

  it("renders a definition as a distinct block with its identifier", () => {
    editor.setMarkdown("see [^1] here\n\n[^1]: a note");

    const marker = editor.view.contentDOM.querySelector(".inksane-footnote-marker");
    expect(marker?.textContent).toBe("1");
    expect(editor.view.contentDOM.querySelector(".inksane-footnote-definition")).not.toBeNull();
    expect(
      editor.view.contentDOM.querySelector(".inksane-footnote-definition-line"),
    ).not.toBeNull();
    expect(editor.view.contentDOM.textContent).toContain("a note");
    expect(editor.view.contentDOM.textContent).not.toContain("[^1]:");
  });

  it("does not turn a footnote reference into an empty link", () => {
    editor = mount("see [^1] here", [LinkExtension(), FootnoteExtension]);

    expect(editor.view.contentDOM.querySelector(".inksane-mark-link-open")).toBeNull();
    expect(editor.view.contentDOM.querySelector(".inksane-footnote-ref")).not.toBeNull();
    expect(findNode("Link")).toBeNull();
  });

  it("reveals the raw reference while the cursor is inside it", () => {
    editor.view.dispatch({ selection: { anchor: 6 } });

    expect(editor.view.contentDOM.textContent).toBe("see [^1] here");
    expect(editor.view.contentDOM.querySelector(".inksane-footnote-ref")).toBeNull();
  });

  it("jumps to the definition when the reference is clicked", () => {
    editor.setMarkdown("see [^1] here\n\n[^1]: a note");
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    const reference = editor.view.contentDOM.querySelector<HTMLElement>(".inksane-footnote-ref");
    reference?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(editor.state.selection.main.anchor).toBe(editor.content.indexOf("[^1]: a note"));
  });

  it("leaves a link whose label starts with a caret intact", () => {
    editor.setMarkdown("[^x](https://example.com)");
    editor.view.dispatch({ selection: { anchor: 0 } });

    expect(findNode("Link")).not.toBeNull();
    expect(editor.view.contentDOM.querySelector(".inksane-footnote-ref")).toBeNull();
  });

  it("converts pasted footnote html", () => {
    editor.view.dispatch({ selection: { anchor: 0, head: editor.content.length } });

    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) =>
          type === "text/html"
            ? '<p>Note<sup role="doc-noteref" data-footnote-id="1">1</sup></p><ol role="doc-endnotes"><li role="doc-endnote" data-footnote-id="1">Body</li></ol>'
            : "",
      },
    });
    editor.view.contentDOM.dispatchEvent(event);

    expect(editor.content).toContain("[^1]");
    expect(editor.content).toContain("[^1]: Body");
  });

  it("is included in BaseKit and can be disabled", () => {
    editor = mount("see [^1] here", [BaseKit()]);
    expect(editor.view.contentDOM.querySelector(".inksane-footnote-ref")).not.toBeNull();

    editor = mount("see [^1] here", [BaseKit({ footnotes: false })]);
    expect(editor.view.contentDOM.querySelector(".inksane-footnote-ref")).toBeNull();
  });
});
