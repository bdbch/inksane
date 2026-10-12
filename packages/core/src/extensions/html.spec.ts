import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";

describe("html decorations", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      element: document.createElement("div"),
      content: '<div class="callout">Hello <strong>HTML</strong></div>\n\nafter',
    });
  });

  afterEach(() => {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  });

  it("renders block html in place of its source", () => {
    editor.view.dispatch({ selection: { anchor: editor.content.length } });
    const block = editor.view.dom.querySelector(".inksane-html-block");

    expect(block).not.toBeNull();
    expect(block?.classList.contains("cm-line")).toBe(true);
    expect(block?.textContent).toContain("Hello");
    expect(editor.view.dom.textContent).not.toContain("<div class");
  });

  it("removes script elements from document html", () => {
    editor.view.dispatch({
      changes: {
        from: 0,
        to: editor.content.length,
        insert: "<div>safe<script>alert(1)</script></div>\n\nafter",
      },
    });
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    expect(editor.view.dom.querySelector(".inksane-html-block script")).toBeNull();
    expect(editor.view.dom.querySelector(".inksane-html-block")?.textContent).toContain("safe");
  });

  it("shows the source while the cursor is inside the block", () => {
    editor.view.dispatch({ selection: { anchor: 1, head: 1 } });

    expect(editor.view.dom.textContent).toContain("<div class");
  });

  it("moves the cursor into the source when the block is clicked", () => {
    editor.view.dispatch({ selection: { anchor: editor.content.length } });
    const block = editor.view.dom.querySelector(".inksane-html-block");
    block?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(editor.state.selection.main.anchor).toBe(0);
    expect(editor.view.dom.textContent).toContain("<div class");
  });

  it("renders a multi-line block with nested elements", () => {
    const content = '<div class="callout">\n  <h3>Title</h3>\n  <p>Body</p>\n</div>\n\nafter';
    editor.view.dispatch({ changes: { from: 0, to: editor.content.length, insert: content } });
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    const block = editor.view.dom.querySelector(".inksane-html-block");

    expect(block?.querySelector("h3")?.textContent).toBe("Title");
    expect(block?.querySelector("p")?.textContent).toBe("Body");
  });

  it("reveals the block when a selection from outside overlaps it", () => {
    const content = 'intro\n\n<div class="callout">Hi</div>\n\nafter';
    editor.view.dispatch({ changes: { from: 0, to: editor.content.length, insert: content } });
    const blockStart = content.indexOf("<div");
    editor.view.dispatch({ selection: { anchor: 2, head: blockStart + 5 } });

    expect(editor.view.dom.textContent).toContain("<div class");
  });

  it("enters the block below on ArrowDown", () => {
    const content = 'intro\n\n<div class="callout">Hi</div>\n\nafter';
    editor.view.dispatch({ changes: { from: 0, to: editor.content.length, insert: content } });
    editor.view.dispatch({ selection: { anchor: editor.state.doc.line(2).from } });

    editor.view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );

    expect(editor.state.selection.main.anchor).toBe(content.indexOf("<div"));
    expect(editor.view.dom.textContent).toContain("<div class");
  });

  it("enters the block above on ArrowUp", () => {
    const content = 'intro\n\n<div class="callout">Hi</div>\n\nafter';
    editor.view.dispatch({ changes: { from: 0, to: editor.content.length, insert: content } });
    editor.view.dispatch({ selection: { anchor: editor.state.doc.line(4).from } });

    editor.view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
    );

    expect(editor.state.selection.main.anchor).toBe(content.indexOf("</div>") + "</div>".length);
    expect(editor.view.dom.textContent).toContain("<div class");
  });

  it("leaves Shift+ArrowDown to the native selection", () => {
    const content = 'intro\n\n<div class="callout">Hi</div>\n\nafter';
    editor.view.dispatch({ changes: { from: 0, to: editor.content.length, insert: content } });
    const start = editor.state.doc.line(2).from;
    editor.view.dispatch({ selection: { anchor: start } });

    editor.view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true, bubbles: true }),
    );

    expect(editor.state.selection.main.anchor).toBe(start);
  });

  it("keeps a revealed block open while dragging", () => {
    const content = 'intro\n\n<div class="callout">Hi</div>\n\nafter';
    editor.view.dispatch({ changes: { from: 0, to: editor.content.length, insert: content } });
    const blockStart = content.indexOf("<div");

    editor.view.contentDOM.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    editor.view.dispatch({ selection: { anchor: 2, head: blockStart + 5 } });
    editor.view.dispatch({ selection: { anchor: 2, head: 2 } });

    expect(editor.view.dom.textContent).toContain("<div class");

    window.dispatchEvent(new MouseEvent("mouseup"));

    expect(editor.view.dom.querySelector(".inksane-html-block")).not.toBeNull();
  });
});
