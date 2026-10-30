import { afterEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import { BaseKit } from "./baseKit.ts";
import { SubscriptExtension } from "./subscript.ts";
import { SuperscriptExtension } from "./superscript.ts";

describe("subscript", () => {
  let editor: Editor;
  const create = (content: string) => {
    editor = new Editor({
      element: document.createElement("div"),
      content,
      extensions: [BaseKit(), SubscriptExtension],
    });
    return editor;
  };
  afterEach(() => editor?.destroy());

  it("renders inline text with hidden markers", () => {
    create("A~2~B");
    expect(editor.view.contentDOM.querySelector(".inksane-mark-subscript")?.textContent).toBe("2");
    expect(editor.view.contentDOM.textContent).toBe("A2B");
    editor.view.dispatch({ selection: { anchor: 2 } });
    expect(editor.isActive("subscript")).toBe(true);
    editor.view.contentDOM.dispatchEvent(new FocusEvent("focus"));
    expect(editor.view.contentDOM.textContent).toBe("A~2~B");
  });

  it("toggles a selection and an enclosing mark at the caret", () => {
    create("hello");
    editor.view.dispatch({ selection: { anchor: 0, head: 5 } });
    expect(editor.commands.toggleSubscript()).toBe(true);
    expect(editor.content).toBe("~hello~");
    editor.view.dispatch({ selection: { anchor: 2 } });
    expect(editor.commands.toggleSubscript()).toBe(true);
    expect(editor.content).toBe("hello");
  });

  it("toggles empty markers and formats text typed inside them", () => {
    create("AB");
    expect(editor.commands.toggleSubscript({ pos: 1 })).toBe(true);
    expect(editor.state.selection.main.from).toBe(2);
    expect(editor.commands.toggleSubscript()).toBe(true);
    expect(editor.content).toBe("AB");
    editor.commands.toggleSubscript();
    editor.view.dispatch(editor.state.replaceSelection("2"));
    expect(editor.content).toBe("A~2~B");
    expect(editor.isActive("subscript")).toBe(true);
  });

  it("toggles twice in a command chain", () => {
    create("hello");
    expect(
      editor
        .chain()
        .toggleSubscript({ pos: { from: 0, to: 5 } })
        .toggleSubscript({ pos: 2 })
        .run(),
    ).toBe(true);
    expect(editor.content).toBe("hello");
  });

  it.each([1, 7])("leaves strikethrough delimiters intact at position %s", (pos) => {
    create("~~gone~~");
    expect(editor.commands.toggleSubscript({ pos })).toBe(false);
    expect(editor.content).toBe("~~gone~~");
  });

  it("formats selected text containing spaces", () => {
    create(" hello world ");
    editor.commands.toggleSubscript({ pos: { from: 0, to: 13 } });
    expect(editor.view.contentDOM.querySelector(".inksane-mark-subscript")?.textContent).toBe(
      " hello world ",
    );
    editor.commands.toggleSubscript({ pos: 3 });
    expect(editor.content).toBe(" hello world ");
  });

  it.each(["inline code", "fenced code", "escaped markers"])("leaves %s literal", (kind) => {
    const syntax = "~2~";
    create(
      kind === "inline code"
        ? "`" + syntax + "`"
        : kind === "fenced code"
          ? "```\n" + syntax + "\n```"
          : syntax.replace(/[=~^]/g, "\\$&"),
    );
    expect(editor.view.contentDOM.querySelector(".inksane-mark-subscript")).toBeNull();
  });

  it.each(["2", "hello world", " hello "])("converts HTML containing %s on paste", (text) => {
    create("");
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) => (type === "text/html" ? `A<sub>${text}</sub>B` : ""),
      },
    });
    editor.view.contentDOM.dispatchEvent(event);
    expect(editor.content).toBe(`A~${text}~B`);
    expect(editor.view.contentDOM.querySelector(".inksane-mark-subscript")?.textContent).toBe(text);
  });

  it("stays out of BaseKit", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "~2~",
      extensions: [BaseKit()],
    });
    expect(editor.commands).not.toHaveProperty("toggleSubscript");
    expect(editor.view.contentDOM.textContent).toBe("~2~");
  });
});

it("keeps subscript separate from strikethrough", () => {
  const editor = new Editor({
    element: document.createElement("div"),
    content: "~~gone~~ H~2~O X^2^",
    extensions: [BaseKit(), SubscriptExtension, SuperscriptExtension],
  });
  try {
    expect(editor.view.contentDOM.querySelector(".inksane-mark-strikethrough")?.textContent).toBe(
      "gone",
    );
    expect(editor.view.contentDOM.querySelector(".inksane-mark-subscript")?.textContent).toBe("2");
    expect(editor.view.contentDOM.querySelector(".inksane-mark-superscript")?.textContent).toBe(
      "2",
    );
  } finally {
    editor.destroy();
  }
});
