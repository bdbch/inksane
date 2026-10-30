import { afterEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import { BaseKit } from "./baseKit.ts";
import { HighlightExtension } from "./highlight.ts";
import { SubscriptExtension } from "./subscript.ts";
import { SuperscriptExtension } from "./superscript.ts";

describe.each([
  {
    name: "highlight",
    extension: HighlightExtension,
    marker: "==",
    command: "toggleHighlight",
    tag: "mark",
  },
  {
    name: "subscript",
    extension: SubscriptExtension,
    marker: "~",
    command: "toggleSubscript",
    tag: "sub",
  },
  {
    name: "superscript",
    extension: SuperscriptExtension,
    marker: "^",
    command: "toggleSuperscript",
    tag: "sup",
  },
] as const)("$name", ({ name, extension, marker, command, tag }) => {
  let editor: Editor;
  const create = (content: string) => {
    editor = new Editor({
      element: document.createElement("div"),
      content,
      extensions: [BaseKit(), extension],
    });
    return editor;
  };
  afterEach(() => editor?.destroy());

  it("renders inline text with hidden markers", () => {
    create(`A${marker}2${marker}B`);
    expect(editor.view.contentDOM.querySelector(`.inksane-mark-${name}`)?.textContent).toBe("2");
    expect(editor.view.contentDOM.textContent).toBe("A2B");
    editor.view.dispatch({ selection: { anchor: 1 + marker.length } });
    expect(editor.isActive(name)).toBe(true);
    editor.view.contentDOM.dispatchEvent(new FocusEvent("focus"));
    expect(editor.view.contentDOM.textContent).toBe(`A${marker}2${marker}B`);
  });

  it("toggles a selection and an enclosing mark at the caret", () => {
    create("hello");
    editor.view.dispatch({ selection: { anchor: 0, head: 5 } });
    expect(editor.commands[command]()).toBe(true);
    expect(editor.content).toBe(`${marker}hello${marker}`);
    editor.view.dispatch({ selection: { anchor: marker.length + 1 } });
    expect(editor.commands[command]()).toBe(true);
    expect(editor.content).toBe("hello");
  });

  it("toggles empty markers and formats text typed inside them", () => {
    create("AB");
    expect(editor.commands[command]({ pos: 1 })).toBe(true);
    expect(editor.state.selection.main.from).toBe(1 + marker.length);
    expect(editor.commands[command]()).toBe(true);
    expect(editor.content).toBe("AB");
    editor.commands[command]();
    editor.view.dispatch(editor.state.replaceSelection("2"));
    expect(editor.content).toBe(`A${marker}2${marker}B`);
    expect(editor.isActive(name)).toBe(true);
  });

  it("toggles twice in a command chain", () => {
    create("hello");
    expect(
      editor
        .chain()
        [command]({ pos: { from: 0, to: 5 } })
        [command]({ pos: marker.length + 1 })
        .run(),
    ).toBe(true);
    expect(editor.content).toBe("hello");
  });

  it("formats selected text containing spaces", () => {
    create(" hello world ");
    editor.commands[command]({ pos: { from: 0, to: 13 } });
    expect(editor.view.contentDOM.querySelector(`.inksane-mark-${name}`)?.textContent).toBe(
      " hello world ",
    );
    editor.commands[command]({ pos: marker.length + 2 });
    expect(editor.content).toBe(" hello world ");
  });

  it.each(["inline code", "fenced code", "escaped markers"])("leaves %s literal", (kind) => {
    const syntax = `${marker}2${marker}`;
    create(
      kind === "inline code"
        ? `\`${syntax}\``
        : kind === "fenced code"
          ? `\`\`\`\n${syntax}\n\`\`\``
          : syntax.replace(/[=~^]/g, "\\$&"),
    );
    expect(editor.view.contentDOM.querySelector(`.inksane-mark-${name}`)).toBeNull();
  });

  it.each(["2", "hello world"])("converts HTML containing %s on paste", (text) => {
    create("");
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) => (type === "text/html" ? `A<${tag}>${text}</${tag}>B` : ""),
      },
    });
    editor.view.contentDOM.dispatchEvent(event);
    expect(editor.content).toBe(`A${marker}${text}${marker}B`);
    expect(editor.view.contentDOM.querySelector(`.inksane-mark-${name}`)?.textContent).toBe(text);
  });

  it("stays out of BaseKit", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: `${marker}2${marker}`,
      extensions: [BaseKit()],
    });
    expect(editor.commands).not.toHaveProperty(command);
    expect(editor.view.contentDOM.textContent).toBe(`${marker}2${marker}`);
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
