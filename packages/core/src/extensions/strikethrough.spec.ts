import { syntaxTree } from "@codemirror/language";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import { BaseKit } from "./baseKit.ts";
import { StrikethroughExtension } from "./strikethrough.ts";

describe("strikethrough", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "hello",
      extensions: [StrikethroughExtension],
    });
  });

  afterEach(() => editor.destroy());

  it("parses and decorates text with hidden markers", () => {
    editor.setMarkdown("~~hello~~");
    expect(syntaxTree(editor.state).topNode.firstChild?.firstChild?.name).toBe("Strikethrough");
    expect(editor.view.contentDOM.querySelector(".inksane-mark-strikethrough")?.textContent).toBe(
      "hello",
    );
    expect(editor.view.contentDOM.textContent).toBe("hello");
    expect(editor.getMarkdown()).toBe("~~hello~~");
  });

  it("reveals markers while editing the struck text", () => {
    editor.setMarkdown("~~hello~~");
    editor.view.dispatch({ selection: { anchor: 4 } });
    editor.view.contentDOM.dispatchEvent(new FocusEvent("focus"));
    expect(editor.view.contentDOM.textContent).toBe("~~hello~~");
  });

  it.each(["`~~hello~~`", "```\n~~hello~~\n```", "\\~\\~hello\\~\\~"])(
    "does not decorate literal syntax in %s",
    (content) => {
      editor.setMarkdown(content);
      expect(editor.view.contentDOM.querySelector(".inksane-mark-strikethrough")).toBeNull();
    },
  );

  it("toggles a selected range on and off", () => {
    editor.view.dispatch({ selection: { anchor: 0, head: 5 } });
    expect(editor.commands.toggleStrikethrough()).toBe(true);
    expect(editor.content).toBe("~~hello~~");
    expect(editor.commands.toggleStrikethrough()).toBe(true);
    expect(editor.content).toBe("hello");
  });

  it("places the caret between empty markers and toggles them off", () => {
    editor.view.dispatch({ selection: { anchor: 2 } });
    expect(editor.commands.toggleStrikethrough()).toBe(true);
    expect(editor.content).toBe("he~~~~llo");
    expect(editor.state.selection.main.from).toBe(4);
    expect(editor.commands.setStrikethrough()).toBe(false);
    expect(editor.commands.toggleStrikethrough()).toBe(true);
    expect(editor.content).toBe("hello");
    expect(editor.state.selection.main.from).toBe(2);
  });

  it("strikes text typed between empty markers", () => {
    editor.commands.setStrikethrough({ pos: 5 });
    editor.view.dispatch(editor.state.replaceSelection("world"));
    expect(editor.content).toBe("hello~~world~~");
    expect(editor.isActive("strikethrough")).toBe(true);
  });

  it.each([
    { from: 4, to: 4 },
    { from: 2, to: 7 },
    { from: 3, to: 5 },
    { from: 0, to: 9 },
  ])("removes enclosing syntax at $from..$to while preserving selection", ({ from, to }) => {
    editor.setMarkdown("~~hello~~");
    editor.view.dispatch({ selection: { anchor: from, head: to } });
    expect(editor.isActive("strikethrough")).toBe(true);
    expect(editor.commands.setStrikethrough()).toBe(false);
    expect(editor.commands.removeStrikethrough()).toBe(true);
    expect(editor.content).toBe("hello");
    expect(editor.state.selection.main.from).toBe(Math.max(0, from - 2));
    expect(editor.state.selection.main.to).toBe(Math.min(5, to - 2));
  });

  it("does not remove adjacent strikethrough at its boundary", () => {
    editor.setMarkdown("~~hello~~");
    expect(editor.commands.removeStrikethrough({ pos: 9 })).toBe(false);
    expect(editor.content).toBe("~~hello~~");
  });

  it("wraps an explicit range and keeps nested formatting", () => {
    editor.setMarkdown("**hello**");
    expect(editor.commands.setStrikethrough({ pos: { from: 0, to: 9 } })).toBe(true);
    expect(editor.content).toBe("~~**hello**~~");
    expect(editor.commands.removeStrikethrough({ pos: 5 })).toBe(true);
    expect(editor.content).toBe("**hello**");
  });

  it("returns false when removing unformatted text", () => {
    expect(editor.commands.removeStrikethrough()).toBe(false);
    expect(editor.content).toBe("hello");
  });

  it("uses projected state in chains", () => {
    expect(
      editor
        .chain()
        .setContent("world")
        .setStrikethrough({ pos: { from: 0, to: 5 } })
        .toggleStrikethrough({ pos: 4 })
        .run(),
    ).toBe(true);
    expect(editor.content).toBe("world");
  });

  it("binds Mod-Shift-x", () => {
    editor.view.dispatch({ selection: { anchor: 0, head: 5 } });
    editor.view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "X",
        code: "KeyX",
        keyCode: 88,
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(editor.content).toBe("~~hello~~");
  });

  it("is included in BaseKit and can be disabled", () => {
    editor.destroy();
    editor = new Editor({
      element: document.createElement("div"),
      content: "~~hello~~",
      extensions: [BaseKit()],
    });
    expect(editor.commands).toHaveProperty("toggleStrikethrough");
    expect(editor.view.contentDOM.querySelector(".inksane-mark-strikethrough")).not.toBeNull();
    editor.destroy();
    editor = new Editor({
      element: document.createElement("div"),
      content: "~~hello~~",
      extensions: [BaseKit({ strikethrough: false })],
    });
    expect(editor.commands).not.toHaveProperty("toggleStrikethrough");
    expect(editor.isActive("strikethrough")).toBe(false);
    expect(editor.view.contentDOM.textContent).toBe("~~hello~~");
  });
});
