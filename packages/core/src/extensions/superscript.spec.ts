import { afterEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import { BaseKit } from "./baseKit.ts";
import { SuperscriptExtension } from "./superscript.ts";

describe("superscript", () => {
  let editor: Editor;
  const create = (content: string) => {
    editor = new Editor({
      element: document.createElement("div"),
      content,
      extensions: [BaseKit(), SuperscriptExtension],
    });
    return editor;
  };
  afterEach(() => editor?.destroy());

  it("renders inline text with hidden markers", () => {
    create("A^2^B");
    expect(editor.view.contentDOM.querySelector(".inksane-mark-superscript")?.textContent).toBe(
      "2",
    );
    expect(editor.view.contentDOM.textContent).toBe("A2B");
    editor.view.dispatch({ selection: { anchor: 2 } });
    expect(editor.isActive("superscript")).toBe(true);
    editor.view.contentDOM.dispatchEvent(new FocusEvent("focus"));
    expect(editor.view.contentDOM.textContent).toBe("A^2^B");
  });

  it("toggles a selection and an enclosing mark at the caret", () => {
    create("hello");
    editor.view.dispatch({ selection: { anchor: 0, head: 5 } });
    expect(editor.commands.toggleSuperscript()).toBe(true);
    expect(editor.content).toBe("^hello^");
    editor.view.dispatch({ selection: { anchor: 2 } });
    expect(editor.commands.toggleSuperscript()).toBe(true);
    expect(editor.content).toBe("hello");
  });

  it("toggles empty markers and formats text typed inside them", () => {
    create("AB");
    expect(editor.commands.toggleSuperscript({ pos: 1 })).toBe(true);
    expect(editor.state.selection.main.from).toBe(2);
    expect(editor.commands.toggleSuperscript()).toBe(true);
    expect(editor.content).toBe("AB");
    editor.commands.toggleSuperscript();
    editor.view.dispatch(editor.state.replaceSelection("2"));
    expect(editor.content).toBe("A^2^B");
    expect(editor.isActive("superscript")).toBe(true);
  });

  it("toggles twice in a command chain", () => {
    create("hello");
    expect(
      editor
        .chain()
        .toggleSuperscript({ pos: { from: 0, to: 5 } })
        .toggleSuperscript({ pos: 2 })
        .run(),
    ).toBe(true);
    expect(editor.content).toBe("hello");
  });

  it("formats selected text containing spaces", () => {
    create(" hello world ");
    editor.commands.toggleSuperscript({ pos: { from: 0, to: 13 } });
    expect(editor.view.contentDOM.querySelector(".inksane-mark-superscript")?.textContent).toBe(
      " hello world ",
    );
    editor.commands.toggleSuperscript({ pos: 3 });
    expect(editor.content).toBe(" hello world ");
  });

  it.each(["inline code", "fenced code", "escaped markers"])("leaves %s literal", (kind) => {
    const syntax = "^2^";
    create(
      kind === "inline code"
        ? "`" + syntax + "`"
        : kind === "fenced code"
          ? "```\n" + syntax + "\n```"
          : syntax.replace(/[=~^]/g, "\\$&"),
    );
    expect(editor.view.contentDOM.querySelector(".inksane-mark-superscript")).toBeNull();
  });

  it.each(["2", "hello world", " hello "])("converts HTML containing %s on paste", (text) => {
    create("");
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) => (type === "text/html" ? `A<sup>${text}</sup>B` : ""),
      },
    });
    editor.view.contentDOM.dispatchEvent(event);
    expect(editor.content).toBe(`A^${text}^B`);
    expect(editor.view.contentDOM.querySelector(".inksane-mark-superscript")?.textContent).toBe(
      text,
    );
  });

  it("stays out of BaseKit", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "^2^",
      extensions: [BaseKit()],
    });
    expect(editor.commands).not.toHaveProperty("toggleSuperscript");
    expect(editor.view.contentDOM.textContent).toBe("^2^");
  });
});
