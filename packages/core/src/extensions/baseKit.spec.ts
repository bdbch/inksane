import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { undoDepth } from "@codemirror/commands";
import { searchPanelOpen } from "@codemirror/search";
import { syntaxTree } from "@codemirror/language";
import { Editor } from "../Editor.ts";
import { BaseKit } from "./baseKit.ts";
import { BoldExtension } from "./bold.ts";
import { LinkExtension } from "./link.ts";

describe("BaseKit", () => {
  let editor: Editor | undefined;

  afterEach(() => editor?.destroy());

  it("provides formatting, placeholder, history, and editing shortcuts", () => {
    editor = new Editor({
      element: document.createElement("div"),
      placeholder: "Write here",
      extensions: [BaseKit()],
    });
    expect(editor.view.dom.querySelector(".inksane-placeholder")).not.toBeNull();
    editor.commands.insertContent({ content: "hello", from: 0 });
    editor.view.dispatch({ selection: { anchor: 0, head: 5 } });
    expect(editor.commands.toggleBold()).toBe(true);
    expect(editor.content).toBe("**hello**");
    expect(editor.isActive("bold")).toBe(true);
    expect(undoDepth(editor.state)).toBeGreaterThan(0);
    editor.view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key: "f", ctrlKey: true, bubbles: true }),
    );
    expect(searchPanelOpen(editor.state)).toBe(true);
  });

  it("can disable every feature while preserving document commands and Markdown parsing", () => {
    editor = new Editor({
      content: "**hello**",
      extensions: [
        BaseKit({
          blockquote: false,
          bold: false,
          code: false,
          defaultKeymap: false,
          heading: false,
          history: false,
          horizontalRule: false,
          html: false,
          image: false,
          italic: false,
          keybinds: false,
          link: false,
          list: false,
          placeholder: false,
          strikethrough: false,
          taskList: false,
          wikiLink: false,
        }),
      ],
    });
    expect(Object.keys(editor.commands).sort()).toEqual([
      "clearContent",
      "cutContent",
      "deleteContent",
      "focus",
      "insertContent",
      "setContent",
    ]);
    expect(editor.isActive("bold")).toBe(false);
    expect(syntaxTree(editor.state).topNode.firstChild?.firstChild?.name).toBe("StrongEmphasis");
    expect(undoDepth(editor.state)).toBe(0);
  });

  it("configures links through kit options", () => {
    const onLinkRequest = vi.fn(() => "https://example.com");
    editor = new Editor({
      element: document.createElement("div"),
      content: "hello",
      extensions: [BaseKit({ link: { onLinkRequest } })],
    });
    editor.view.dispatch({ selection: { anchor: 0, head: 5 } });
    editor.view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
    );
    expect(editor.content).toBe("[hello](https://example.com)");
    expect(onLinkRequest).toHaveBeenCalledOnce();
  });

  it("accepts a separate replacement when the kit feature is disabled", () => {
    editor = new Editor({
      content: "hello",
      extensions: [BaseKit({ link: false }), LinkExtension({ onLinkRequest: () => null })],
    });
    expect(editor.commands).toHaveProperty("setLink");
  });

  it("renders wiki links through the kit", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "[[Note|Visible]]",
      extensions: [BaseKit()],
    });

    expect(editor.view.dom.querySelector(".inksane-mark-wiki-link")).not.toBeNull();
    expect(editor.view.dom.querySelector(".inksane-mark-link-open")).toBeNull();
  });

  it("configures wiki link resolution through kit options", () => {
    const resolveTarget = vi.fn();
    editor = new Editor({
      element: document.createElement("div"),
      content: "[[Note]]",
      extensions: [BaseKit({ wikiLink: { resolveTarget } })],
    });
    editor.view.dispatch({ selection: { anchor: 3 } });

    expect(editor.commands.openWikiLink()).toBe(true);
    expect(resolveTarget).toHaveBeenCalledWith("Note");
  });

  it("registers only the selected feature without a kit", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "hello",
      extensions: [BoldExtension],
    });
    expect(editor.commands.toggleBold({ pos: { from: 0, to: 5 } })).toBe(true);
    expect(editor.content).toBe("**hello**");
    expect(editor.commands).not.toHaveProperty("toggleItalic");
    expect(editor.commands).not.toHaveProperty("setLink");
    expect(undoDepth(editor.state)).toBe(0);
  });
});
