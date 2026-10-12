import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import type { EditorView } from "@codemirror/view";
import { Editor } from "../Editor.ts";

/** Dispatches a paste event with the given clipboard data. */
function paste(view: EditorView, data: Record<string, string>): void {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: { getData: (type: string) => data[type] ?? "" },
  });
  view.contentDOM.dispatchEvent(event);
}

describe("html paste", () => {
  let editor: Editor;

  const pasteHtml = (html: string) => {
    editor.view.dispatch({ selection: { anchor: 0, head: editor.content.length } });
    paste(editor.view, { "text/html": html });
  };

  beforeEach(() => {
    editor = new Editor({ element: document.createElement("div"), content: "start" });
  });

  afterEach(() => {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  });

  it("inserts converted markdown over the selection", () => {
    pasteHtml("<p>Hello <strong>world</strong></p>");

    expect(editor.content).toBe("Hello **world**");
  });

  it("converts headings", () => {
    pasteHtml("<h2>Title</h2>");

    expect(editor.content).toBe("## Title");
  });

  it("converts bullet and ordered lists", () => {
    pasteHtml('<ol start="2"><li>a</li><li>b</li></ol>');

    expect(editor.content).toBe("2. a\n3. b");
  });

  it("converts links", () => {
    pasteHtml('<a href="https://example.com">Example</a>');

    expect(editor.content).toBe("[Example](https://example.com)");
  });

  it("converts fenced code blocks with a language", () => {
    pasteHtml('<pre><code class="language-js">const a = 1;</code></pre>');

    expect(editor.content).toBe("```js\nconst a = 1;\n```");
  });

  it("converts inline code", () => {
    pasteHtml("<p>Use <code>pnpm</code> now</p>");

    expect(editor.content).toBe("Use `pnpm` now");
  });

  it("converts blockquotes", () => {
    pasteHtml("<blockquote><p>hi</p></blockquote>");

    expect(editor.content).toBe("> hi");
  });

  it("keeps text for a tag no extension owns", () => {
    pasteHtml("<p><del>gone</del></p>");

    expect(editor.content).toBe("gone");
  });

  it("leaves plain text pastes to the editor", () => {
    editor.view.dispatch({ selection: { anchor: editor.content.length } });
    paste(editor.view, { "text/plain": "plain" });

    expect(editor.content).toBe("startplain");
  });

  it("converts html pasted as plain text", () => {
    editor.view.dispatch({ selection: { anchor: editor.content.length } });
    paste(editor.view, { "text/plain": "<h1>Title</h1>" });

    expect(editor.content).toBe("start# Title");
  });

  it("leaves plain text with a stray < untouched", () => {
    editor.view.dispatch({ selection: { anchor: editor.content.length } });
    paste(editor.view, { "text/plain": "a < b > c" });

    expect(editor.content).toBe("starta < b > c");
  });

  it("falls back to plain text when html converts to nothing", () => {
    editor.view.dispatch({ selection: { anchor: editor.content.length } });
    paste(editor.view, { "text/html": '<meta charset="utf-8">', "text/plain": "plain" });

    expect(editor.content).toBe("startplain");
  });
});
