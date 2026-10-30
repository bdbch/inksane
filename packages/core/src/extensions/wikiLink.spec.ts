import { syntaxTree } from "@codemirror/language";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import type { WikiLinkOptions } from "./wikiLink.ts";
import { WikiLinkExtension } from "./wikiLink.ts";

const countNodes = (editor: Editor, name: string): number => {
  let count = 0;
  syntaxTree(editor.state).iterate({
    enter(node) {
      if (node.name === name) count += 1;
    },
  });
  return count;
};

describe("wiki link parsing", () => {
  let editor: Editor | undefined;

  const mount = (content: string, options?: WikiLinkOptions) => {
    const element = document.createElement("div");
    document.body.append(element);
    editor = new Editor({
      element,
      content,
      extensions: [WikiLinkExtension(options)],
    });
    return editor;
  };

  afterEach(() => {
    editor?.view.dom.parentElement?.remove();
    editor?.destroy();
    editor = undefined;
  });

  it("parses [[target]] as a wiki link instead of a Markdown link", () => {
    const instance = mount("[[Wiki Link]]");

    expect(countNodes(instance, "WikiLink")).toBe(1);
    expect(countNodes(instance, "Link")).toBe(0);
    expect(instance.getMarkdown()).toBe("[[Wiki Link]]");
  });

  it("parses [[target|label]] with a target and label", () => {
    const instance = mount("[[target|label]]");

    expect(countNodes(instance, "WikiLink")).toBe(1);
    expect(countNodes(instance, "WikiLinkTarget")).toBe(1);
    expect(countNodes(instance, "WikiLinkLabel")).toBe(1);
    expect(countNodes(instance, "Link")).toBe(0);
  });

  it("leaves malformed wiki links as Markdown text", () => {
    const instance = mount("[[unclosed");

    for (const content of ["[[unclosed", "[[a|]]", "[[a[b]]", "[[a\nb]]"]) {
      instance.setMarkdown(content);

      expect(countNodes(instance, "WikiLink")).toBe(0);
      expect(instance.getMarkdown()).toBe(content);
    }
  });

  it("keeps normal Markdown links working", () => {
    const instance = mount("[text](https://example.com)");

    expect(countNodes(instance, "Link")).toBe(1);
    expect(countNodes(instance, "WikiLink")).toBe(0);
  });
});

describe("wiki link rendering", () => {
  let editor: Editor;

  const mount = (content: string) => {
    const element = document.createElement("div");
    document.body.append(element);
    editor = new Editor({ element, content, extensions: [WikiLinkExtension()] });
    return editor;
  };

  afterEach(() => {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  });

  it("renders a distinct class and no open-link icon", () => {
    mount("[[wiki link]]");

    expect(editor.view.dom.querySelector(".inksane-mark-wiki-link")).not.toBeNull();
    expect(editor.view.dom.querySelector(".inksane-mark-link")).toBeNull();
    expect(editor.view.dom.querySelector(".inksane-mark-link-open")).toBeNull();
  });

  it("shows the target for an unlabeled link", () => {
    mount("[[Wiki Link]]");

    expect(editor.view.contentDOM.textContent).toBe("Wiki Link");
  });

  it("shows only the label for a labeled link", () => {
    mount("[[target|Visible label]]");

    expect(editor.view.contentDOM.textContent).toBe("Visible label");
    expect(editor.view.contentDOM.textContent).not.toContain("target");
  });

  it("reveals the source around the selection", () => {
    mount("[[target|label]]");
    editor.view.focus();
    editor.view.dispatch({ selection: { anchor: 4 } });

    expect(editor.view.contentDOM.textContent).toBe("[[target|label]]");
  });

  it("reports the wikiLink state query", () => {
    mount("[[target]]");
    editor.view.dispatch({ selection: { anchor: 4 } });

    expect(editor.isActive("wikiLink")).toBe(true);
    expect(editor.isActive("link")).toBe(false);
  });
});

describe("wiki link commands", () => {
  let editor: Editor;

  const mount = (content: string, selection?: { anchor: number; head: number }) => {
    const element = document.createElement("div");
    document.body.append(element);
    editor = new Editor({ element, content, extensions: [WikiLinkExtension()] });
    if (selection) editor.view.dispatch({ selection });
    return editor;
  };

  afterEach(() => {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  });

  it("inserts a wiki link for a target", () => {
    mount("Hello world", { anchor: 0, head: 0 });

    expect(editor.commands.insertWikiLink({ target: "Note" })).toBe(true);
    expect(editor.content).toBe("[[Note]]Hello world");
  });

  it("uses selected text as the label", () => {
    mount("Hello world", { anchor: 0, head: 5 });

    expect(editor.commands.insertWikiLink({ target: "Note" })).toBe(true);
    expect(editor.content).toBe("[[Note|Hello]] world");
  });

  it("uses an explicit label", () => {
    mount("Hello", { anchor: 0, head: 0 });

    expect(editor.commands.insertWikiLink({ target: "note-id", label: "My note" })).toBe(true);
    expect(editor.content).toBe("[[note-id|My note]]Hello");
  });

  it("rejects invalid targets and labels", () => {
    mount("Hello", { anchor: 0, head: 0 });

    expect(editor.commands.insertWikiLink({ target: "  " })).toBe(false);
    expect(editor.commands.insertWikiLink({ target: "a|b" })).toBe(false);
    expect(editor.commands.insertWikiLink({ target: "a]b" })).toBe(false);
    expect(editor.commands.insertWikiLink({ target: "a\nb" })).toBe(false);
    expect(editor.commands.insertWikiLink({ target: "a", label: "" })).toBe(false);
    expect(editor.commands.insertWikiLink({ target: "a", label: "b]c" })).toBe(false);
    expect(editor.content).toBe("Hello");
  });
});

describe("wiki link resolution", () => {
  let editor: Editor;

  const mount = (content: string, options?: WikiLinkOptions) => {
    const element = document.createElement("div");
    document.body.append(element);
    editor = new Editor({ element, content, extensions: [WikiLinkExtension(options)] });
    return editor;
  };

  afterEach(() => {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  });

  it("resolves a target through the command", () => {
    const resolveTarget = vi.fn();
    mount("[[Target|label]]", { resolveTarget });
    editor.view.dispatch({ selection: { anchor: 3 } });

    expect(editor.commands.openWikiLink()).toBe(true);
    expect(resolveTarget).toHaveBeenCalledWith("Target");
  });

  it("resolves an explicit target through the command", () => {
    const resolveTarget = vi.fn();
    mount("No wiki link", { resolveTarget });

    expect(editor.commands.openWikiLink({ target: "Another note" })).toBe(true);
    expect(resolveTarget).toHaveBeenCalledWith("Another note");
  });

  it("does not resolve during a canRun check", () => {
    const resolveTarget = vi.fn();
    mount("[[Target|label]]", { resolveTarget });
    editor.view.dispatch({ selection: { anchor: 3 } });

    expect(editor.canRun("openWikiLink")).toBe(true);
    expect(resolveTarget).not.toHaveBeenCalled();

    expect(editor.commands.openWikiLink()).toBe(true);
    expect(resolveTarget).toHaveBeenCalledOnce();
    expect(resolveTarget).toHaveBeenCalledWith("Target");
  });

  it("does not resolve explicit targets during a canRun check", () => {
    const resolveTarget = vi.fn();
    mount("No wiki link", { resolveTarget });

    expect(editor.canRun("openWikiLink", { target: "Another note" })).toBe(true);
    expect(resolveTarget).not.toHaveBeenCalled();

    expect(editor.commands.openWikiLink({ target: "Another note" })).toBe(true);
    expect(resolveTarget).toHaveBeenCalledOnce();
    expect(resolveTarget).toHaveBeenCalledWith("Another note");
  });

  it("does nothing without a resolver", () => {
    mount("[[Target]]");
    editor.view.dispatch({ selection: { anchor: 3 } });

    expect(editor.commands.openWikiLink()).toBe(false);
  });

  it("resolves a wiki link on Mod-click", () => {
    const resolveTarget = vi.fn();
    mount("[[Target|label]]", { resolveTarget });

    const line = editor.view.contentDOM.querySelector(".cm-line");
    expect(line).not.toBeNull();
    line?.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));

    expect(resolveTarget).toHaveBeenCalledWith("Target");
  });

  it("ignores a plain click", () => {
    const resolveTarget = vi.fn();
    mount("[[Target|label]]", { resolveTarget });

    const line = editor.view.contentDOM.querySelector(".cm-line");
    line?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(resolveTarget).not.toHaveBeenCalled();
  });
});
