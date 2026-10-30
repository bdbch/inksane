import { afterEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import { BaseKit } from "./baseKit.ts";
import { HighlightExtension } from "./highlight.ts";

describe("highlight", () => {
  let editor: Editor;
  const create = (content: string) => {
    editor = new Editor({
      element: document.createElement("div"),
      content,
      extensions: [BaseKit(), HighlightExtension],
    });
    return editor;
  };
  afterEach(() => editor?.destroy());

  it("renders inline text with hidden markers", () => {
    create("A==2==B");
    expect(editor.view.contentDOM.querySelector(".inksane-mark-highlight")?.textContent).toBe("2");
    expect(editor.view.contentDOM.textContent).toBe("A2B");
    editor.view.dispatch({ selection: { anchor: 3 } });
    expect(editor.isActive("highlight")).toBe(true);
    editor.view.contentDOM.dispatchEvent(new FocusEvent("focus"));
    expect(editor.view.contentDOM.textContent).toBe("A==2==B");
  });

  it("toggles a selection and an enclosing mark at the caret", () => {
    create("hello");
    editor.view.dispatch({ selection: { anchor: 0, head: 5 } });
    expect(editor.commands.toggleHighlight()).toBe(true);
    expect(editor.content).toBe("==hello==");
    editor.view.dispatch({ selection: { anchor: 3 } });
    expect(editor.commands.toggleHighlight()).toBe(true);
    expect(editor.content).toBe("hello");
  });

  it("toggles empty markers and formats text typed inside them", () => {
    create("AB");
    expect(editor.commands.toggleHighlight({ pos: 1 })).toBe(true);
    expect(editor.state.selection.main.from).toBe(3);
    expect(editor.commands.toggleHighlight()).toBe(true);
    expect(editor.content).toBe("AB");
    editor.commands.toggleHighlight();
    editor.view.dispatch(editor.state.replaceSelection("2"));
    expect(editor.content).toBe("A==2==B");
    expect(editor.isActive("highlight")).toBe(true);
  });

  it("toggles twice in a command chain", () => {
    create("hello");
    expect(
      editor
        .chain()
        .toggleHighlight({ pos: { from: 0, to: 5 } })
        .toggleHighlight({ pos: 3 })
        .run(),
    ).toBe(true);
    expect(editor.content).toBe("hello");
  });

  it("formats selected text containing spaces", () => {
    create(" hello world ");
    editor.commands.toggleHighlight({ pos: { from: 0, to: 13 } });
    expect(editor.view.contentDOM.querySelector(".inksane-mark-highlight")?.textContent).toBe(
      " hello world ",
    );
    editor.commands.toggleHighlight({ pos: 4 });
    expect(editor.content).toBe(" hello world ");
  });

  it.each(["inline code", "fenced code", "escaped markers"])("leaves %s literal", (kind) => {
    const syntax = "==2==";
    create(
      kind === "inline code"
        ? "`" + syntax + "`"
        : kind === "fenced code"
          ? "```\n" + syntax + "\n```"
          : syntax.replace(/[=~^]/g, "\\$&"),
    );
    expect(editor.view.contentDOM.querySelector(".inksane-mark-highlight")).toBeNull();
  });

  it.each(["2", "hello world", " hello "])("converts HTML containing %s on paste", (text) => {
    create("");
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) => (type === "text/html" ? `A<mark>${text}</mark>B` : ""),
      },
    });
    editor.view.contentDOM.dispatchEvent(event);
    expect(editor.content).toBe(`A==${text}==B`);
    expect(editor.view.contentDOM.querySelector(".inksane-mark-highlight")?.textContent).toBe(text);
  });

  it("stays out of BaseKit", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "==2==",
      extensions: [BaseKit()],
    });
    expect(editor.commands).not.toHaveProperty("toggleHighlight");
    expect(editor.view.contentDOM.textContent).toBe("==2==");
  });
});
