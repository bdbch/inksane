import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "./Editor.ts";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { LinkExtension } from "./extensions/link.ts";
import { BaseKit } from "./extensions/baseKit.ts";

function createEditor() {
  const mount = document.createElement("div");
  const editor = new Editor({ element: mount });
  return editor;
}

describe("Editor", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createEditor();
  });

  afterEach(() => {
    if (editor) {
      editor.view.dom.parentElement?.remove();
      editor.destroy();
    }
  });

  it("creates the editor and mounts the dom", () => {
    expect(editor).toBeDefined();
    expect(editor).toBeInstanceOf(Editor);
  });

  it("registers only document commands without feature extensions", () => {
    expect(editor.commands).toHaveProperty("insertContent");
    expect(editor.commands).not.toHaveProperty("toggleBold");
    expect(editor.commands).not.toHaveProperty("setLink");
    expect(editor.isActive("bold")).toBe(false);
  });

  it("correctly creates the view and state", () => {
    const mount = document.createElement("div");
    const editor = new Editor({ element: mount });

    expect(editor.state).toBeInstanceOf(EditorState);
    expect(editor.view).toBeInstanceOf(EditorView);
    expect(editor.view.state).toBe(editor.state);
  });

  it("wraps long lines by default", () => {
    const mount = document.createElement("div");
    const editor = new Editor({ element: mount });

    expect(editor.view.contentDOM.classList.contains("cm-lineWrapping")).toBe(true);

    editor.destroy();
  });

  it("does not wrap long lines when lineWrapping is disabled", () => {
    const mount = document.createElement("div");
    const editor = new Editor({ element: mount, lineWrapping: false });

    expect(editor.view.contentDOM.classList.contains("cm-lineWrapping")).toBe(false);

    editor.destroy();
  });

  it("decorates Markdown bold syntax", () => {
    const mount = document.createElement("div");
    document.body.append(mount);
    const editor = new Editor({ element: mount, content: "**bold**", extensions: [BaseKit()] });
    editor.view.focus();

    expect(editor.view.dom.querySelector(".inksane-mark-bold")?.textContent).toBe("**bold**");

    editor.destroy();
    mount.remove();
  });

  it("creates a detached editor when no element is passed", () => {
    const editor = new Editor({ content: "# Hi" });

    expect(editor.isMounted).toBe(false);
    expect(editor.state).toBeInstanceOf(EditorState);
    expect(editor.content).toBe("# Hi");
  });

  it("throws when reading the view before mount", () => {
    const editor = new Editor({});

    expect(() => editor.view).toThrow();
  });

  it("mounts into an element after creation", () => {
    const mount = document.createElement("div");
    const editor = new Editor({ content: "# Hi" });

    editor.mount(mount);

    expect(editor.isMounted).toBe(true);
    expect(editor.view).toBeInstanceOf(EditorView);
    expect(mount.contains(editor.view.dom)).toBe(true);

    editor.destroy();
  });

  it("applies content set before mount", () => {
    const mount = document.createElement("div");
    const editor = new Editor({});

    editor.content = "# Later";
    editor.mount(mount);

    expect(editor.content).toBe("# Later");

    editor.destroy();
  });

  it("ignores a second mount", () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    const editor = new Editor({});

    editor.mount(first);
    editor.mount(second);

    expect(first.contains(editor.view.dom)).toBe(true);
    expect(second.contains(editor.view.dom)).toBe(false);

    editor.destroy();
  });

  it("detaches the view on destroy", () => {
    const editor = new Editor({ element: document.createElement("div") });

    editor.destroy();

    expect(editor.isMounted).toBe(false);
  });

  it("emits update when the document changes", () => {
    const editor = new Editor({ element: document.createElement("div") });
    let updates = 0;

    editor.on("update", () => {
      updates += 1;
    });

    editor.view.dispatch({ changes: { from: 0, insert: "hi" } });

    expect(updates).toBe(1);

    editor.destroy();
  });

  it("emits selectionUpdate when the selection changes", () => {
    const editor = new Editor({ element: document.createElement("div"), content: "hello" });
    const ranges: Array<{ from: number; to: number }> = [];

    editor.on("selectionUpdate", ({ selection }) => {
      ranges.push({ from: selection.main.from, to: selection.main.to });
    });

    editor.view.dispatch({ selection: { anchor: 1, head: 4 } });

    expect(ranges).toEqual([{ from: 1, to: 4 }]);

    editor.destroy();
  });

  describe("document serialization", () => {
    it("returns the Markdown source from getMarkdown", () => {
      const editor = new Editor({ content: "# Hi\n\n**bold**" });

      expect(editor.getMarkdown()).toBe("# Hi\n\n**bold**");

      editor.destroy();
    });

    it("replaces the document from setMarkdown", () => {
      const editor = new Editor({ content: "old" });

      editor.setMarkdown("# New\n\ntext");

      expect(editor.getMarkdown()).toBe("# New\n\ntext");
      expect(editor.content).toBe("# New\n\ntext");

      editor.destroy();
    });

    it("applies Markdown set before mount", () => {
      const editor = new Editor({});

      editor.setMarkdown("# Later");
      editor.mount(document.createElement("div"));

      expect(editor.getMarkdown()).toBe("# Later");

      editor.destroy();
    });

    it("returns the document as a line array from textJSON", () => {
      const editor = new Editor({ content: "a\nb" });

      expect(editor.textJSON).toEqual(["a", "b"]);

      editor.destroy();
    });

    it("replaces the document from a textJSON line array", () => {
      const editor = new Editor({ content: "a\nb" });

      editor.textJSON = ["c", "d"];

      expect(editor.getMarkdown()).toBe("c\nd");

      editor.destroy();
    });
  });

  it("registers a configured feature without a kit", () => {
    const mount = document.createElement("div");
    const editor = new Editor({
      element: mount,
      content: "hello",
      extensions: [LinkExtension({ onLinkRequest: () => "https://example.com" })],
    });

    editor.view.dispatch({ selection: { anchor: 0, head: 5 } });
    editor.view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
    );

    expect(editor.content).toBe("[hello](https://example.com)");

    editor.destroy();
  });
});

describe("selection and state queries", () => {
  let editor: Editor | undefined;

  const mount = (content: string, selection?: { anchor: number; head?: number }) => {
    editor?.destroy();
    editor = new Editor({
      element: document.createElement("div"),
      content,
      extensions: [BaseKit()],
    });
    if (selection) editor.view.dispatch({ selection });
    return editor;
  };

  afterEach(() => {
    if (editor) {
      editor.view.dom.parentElement?.remove();
      editor.destroy();
      editor = undefined;
    }
  });

  describe("isActive", () => {
    it("detects an inline mark around a collapsed selection", () => {
      const instance = mount("**bold** text", { anchor: 3 });

      expect(instance.isActive("bold")).toBe(true);
    });

    it("ignores an inline mark when the caret is outside it", () => {
      const instance = mount("**bold** text", { anchor: 10 });

      expect(instance.isActive("bold")).toBe(false);
    });

    it("detects an inline mark for a selection inside it", () => {
      const instance = mount("**bold** text", { anchor: 2, head: 6 });

      expect(instance.isActive("bold")).toBe(true);
    });

    it("detects italic and inline code separately", () => {
      const instance = mount("*italic* and `code`", { anchor: 3 });

      expect(instance.isActive("italic")).toBe(true);
      expect(instance.isActive("code")).toBe(false);

      instance.view.dispatch({ selection: { anchor: 16 } });

      expect(instance.isActive("code")).toBe(true);
      expect(instance.isActive("italic")).toBe(false);
    });

    it("matches link attributes", () => {
      const instance = mount("[text](https://example.com) rest", { anchor: 3 });

      expect(instance.isActive("link")).toBe(true);
      expect(instance.isActive("link", { href: "https://example.com" })).toBe(true);
      expect(instance.isActive("link", { href: "https://other.com" })).toBe(false);
    });

    it("detects headings and their level", () => {
      const instance = mount("# Title\n\nbody", { anchor: 3 });

      expect(instance.isActive("heading")).toBe(true);
      expect(instance.isActive("heading", { level: 1 })).toBe(true);
      expect(instance.isActive("heading", { level: 2 })).toBe(false);

      instance.view.dispatch({ selection: { anchor: 10 } });

      expect(instance.isActive("heading")).toBe(false);
    });

    it("tells bullet and ordered lists apart", () => {
      const bullet = mount("- one\n- two", { anchor: 3 });

      expect(bullet.isActive("bulletList")).toBe(true);
      expect(bullet.isActive("orderedList")).toBe(false);

      const ordered = mount("1. one\n2. two", { anchor: 4 });

      expect(ordered.isActive("orderedList")).toBe(true);
      expect(ordered.isActive("bulletList")).toBe(false);
    });

    it("detects code blocks and blockquotes", () => {
      const code = mount("```js\nconst a = 1;\n```", { anchor: 8 });

      expect(code.isActive("codeBlock")).toBe(true);
      expect(code.isActive("code")).toBe(false);

      const quote = mount("> quoted", { anchor: 4 });

      expect(quote.isActive("blockquote")).toBe(true);
      expect(quote.isActive("heading")).toBe(false);
    });
  });

  describe("getMarkRange", () => {
    it("returns the range of the active mark", () => {
      const instance = mount("**bold** text", { anchor: 3 });

      expect(instance.getMarkRange("bold")).toEqual({ from: 0, to: 8 });
    });

    it("returns the innermost mark when no name is given", () => {
      const instance = mount("**a [b](https://example.com) c**", { anchor: 8 });

      expect(instance.getMarkRange()).toEqual({ from: 4, to: 28 });
    });

    it("returns null when no mark is active", () => {
      const instance = mount("plain text", { anchor: 3 });

      expect(instance.getMarkRange("bold")).toBeNull();
      expect(instance.getMarkRange()).toBeNull();
    });
  });

  describe("canRun", () => {
    it("reports false when the editor is not mounted", () => {
      const instance = new Editor({ content: "hello" });

      expect(instance.canRun("clearContent")).toBe(false);

      instance.destroy();
    });

    it("reports the command result once mounted", () => {
      const instance = new Editor({ content: "hello" });

      instance.mount(document.createElement("div"));
      expect(instance.canRun("clearContent")).toBe(true);

      instance.view.dom.parentElement?.remove();
      instance.destroy();
    });

    it("reports true without changing the document", () => {
      const instance = mount("hello", { anchor: 1, head: 4 });

      expect(instance.canRun("toggleBold")).toBe(true);
      expect(instance.content).toBe("hello");

      expect(instance.commands.toggleBold()).toBe(true);
      expect(instance.content).toBe("h**ell**o");
    });

    it("reports false when the command cannot apply", () => {
      const instance = mount("plain", { anchor: 2 });

      expect(instance.canRun("removeHeading")).toBe(false);
      expect(instance.commands.removeHeading()).toBe(false);
    });

    it("accepts command arguments", () => {
      const instance = mount("Title", { anchor: 2 });

      expect(instance.canRun("setHeading", { level: 1 })).toBe(true);
      expect(instance.content).toBe("Title");

      expect(instance.commands.setHeading({ level: 1 })).toBe(true);
      expect(instance.content).toBe("# Title");
    });

    it("matches the command result for a nested command", () => {
      const instance = mount("**bold**", { anchor: 0, head: 8 });

      expect(instance.canRun("toggleBold")).toBe(true);
      expect(instance.content).toBe("**bold**");

      expect(instance.commands.toggleBold()).toBe(true);
      expect(instance.content).toBe("bold");
    });
  });
});
