import { syntaxTree } from "@codemirror/language";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import { FrontmatterExtension, getYaml } from "./frontmatter.ts";

const CONTENT = `---
title: Release notes
draft: false
tags:
  - docs
  - editor
author:
  name: Ada
  role: Writer
---

Body text`;

describe("frontmatter", () => {
  let editor: Editor;

  const mount = (content: string, extensions = [FrontmatterExtension]) => {
    const element = document.createElement("div");
    document.body.append(element);
    editor = new Editor({ element, content, extensions });
    return editor;
  };

  const countNodes = (name: string): number => {
    let count = 0;
    syntaxTree(editor.state).iterate({
      enter(node) {
        if (node.name === name) count += 1;
      },
    });
    return count;
  };

  afterEach(() => {
    editor?.view.dom.parentElement?.remove();
    editor?.destroy();
  });

  it("parses a leading block as frontmatter instead of horizontal rules", () => {
    mount(CONTENT);

    expect(countNodes("Frontmatter")).toBe(1);
    expect(countNodes("HorizontalRule")).toBe(0);
    expect(editor.getMarkdown()).toBe(CONTENT);
  });

  it("keeps the normal Markdown meaning when the closing fence is missing", () => {
    mount("---\ntitle: Release notes\n\nBody text");

    expect(countNodes("Frontmatter")).toBe(0);
    expect(countNodes("HorizontalRule")).toBe(1);
  });

  it("only recognizes a block at the start of the document", () => {
    mount("Body text\n\n---\ntitle: Release notes\n---");

    expect(countNodes("Frontmatter")).toBe(0);
    expect(countNodes("HorizontalRule")).toBeGreaterThan(0);
  });

  it("renders a properties table while the cursor is outside", () => {
    mount(CONTENT);
    editor.view.focus();
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    const widget = editor.view.dom.querySelector(".inksane-frontmatter-widget");

    expect(widget).not.toBeNull();
    expect(editor.view.dom.querySelector(".inksane-frontmatter-panel")).not.toBeNull();
    expect(editor.view.dom.textContent).toContain("Properties");
    expect(editor.view.dom.textContent).toContain("title");
    expect(editor.view.dom.textContent).toContain("Release notes");
    expect(editor.view.dom.textContent).toContain("2 items");
    expect(editor.view.dom.textContent).not.toContain("title: Release notes");
  });

  it("reveals the YAML while the cursor is inside the block", () => {
    mount(CONTENT);
    editor.view.focus();
    editor.view.dispatch({ selection: { anchor: editor.content.indexOf("title") } });

    expect(editor.view.dom.querySelector(".inksane-frontmatter-panel")).toBeNull();
    expect(editor.view.dom.textContent).toContain("title: Release notes");
    expect(editor.view.dom.textContent).toContain("---");
  });

  it("moves the cursor into the block when the table is clicked", () => {
    mount(CONTENT);
    editor.view.focus();
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    editor.view.dom
      .querySelector("[data-frontmatter-edit]")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(editor.state.selection.main.anchor).toBe(4);
    expect(editor.view.dom.textContent).toContain("title: Release notes");

    editor.commands.insertContent({
      content: "edited ",
      from: editor.content.indexOf("Release notes"),
    });
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    expect(getYaml(editor)).toMatchObject({ title: "edited Release notes" });
  });

  it("adds a YAML line when editing an empty block", () => {
    mount("---\n---\n\nBody");
    editor.view.focus();
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    editor.view.dom
      .querySelector("[data-frontmatter-edit]")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(editor.getMarkdown()).toBe("---\n\n---\n\nBody");
    expect(editor.state.selection.main.anchor).toBe(4);

    editor.commands.insertContent({ content: "title: New", from: 4 });
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    expect(getYaml(editor)).toEqual({ title: "New" });
  });

  it("keeps an existing blank YAML line when editing", () => {
    mount("---\n\n---\n\nBody");
    editor.view.focus();
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    editor.view.dom
      .querySelector("[data-frontmatter-edit]")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(editor.getMarkdown()).toBe("---\n\n---\n\nBody");
    expect(editor.state.selection.main.anchor).toBe(4);
  });

  it("uses current offsets when the widget is reused", () => {
    mount("---\n---\n\nBody");
    editor.view.focus();
    editor.view.dispatch({ selection: { anchor: editor.content.length } });
    editor.view.dispatch({ changes: { from: 3, insert: "  " } });

    editor.view.dom
      .querySelector("[data-frontmatter-edit]")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(editor.getMarkdown()).toBe("---  \n\n---\n\nBody");
    expect(editor.state.selection.main.anchor).toBe(6);
  });

  it("enters edit mode when a value row is clicked", () => {
    mount(CONTENT);
    editor.view.focus();
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    editor.view.dom
      .querySelector(".inksane-frontmatter-value")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(editor.state.selection.main.anchor).toBe(4);
    expect(editor.view.dom.textContent).toContain("title: Release notes");
  });

  it("collapses nested values by default and expands them on click", () => {
    mount(CONTENT);
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    const group = editor.view.dom.querySelector(".inksane-frontmatter-children");
    expect(group?.hasAttribute("hidden")).toBe(true);

    const button = editor.view.dom.querySelector("[data-frontmatter-group-toggle]");
    button?.querySelector("svg")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(group?.hasAttribute("hidden")).toBe(false);
    expect(group?.textContent).toContain("docs");
    expect(group?.textContent).toContain("editor");
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(button?.getAttribute("aria-label")).toContain("Collapse");
  });

  it("collapses the whole table without changing the selection", () => {
    mount(CONTENT);
    editor.view.dispatch({ selection: { anchor: editor.content.length } });
    const selectionBefore = editor.state.selection.main;

    const button = editor.view.dom.querySelector("[data-frontmatter-panel-toggle]");
    button?.querySelector("svg")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const body = editor.view.dom.querySelector(".inksane-frontmatter-body");
    expect(body?.hasAttribute("hidden")).toBe(true);
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(button?.getAttribute("aria-label")).toBe("Expand properties");
    expect(editor.state.selection.main.eq(selectionBefore)).toBe(true);
  });

  it("renders values as text instead of HTML", () => {
    mount('---\ntitle: "<img src=x onerror=alert(1)>"\n---\n\nBody');
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    expect(editor.view.dom.querySelector(".inksane-frontmatter-widget img")).toBeNull();
    expect(editor.view.dom.textContent).toContain("<img src=x onerror=alert(1)>");
  });

  it("shows an error instead of broken data for invalid YAML", () => {
    mount("---\ntitle: [unclosed\n---\n\nBody");
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    expect(editor.view.dom.querySelector(".inksane-frontmatter-error")).not.toBeNull();
    expect(editor.view.dom.textContent).toContain("Properties");
  });

  it("shows an empty state for a block without values", () => {
    mount("---\n---\n\nBody");
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    expect(editor.view.dom.textContent).toContain("No properties");
  });

  it("returns to a horizontal rule when the closing fence is removed", () => {
    mount("---\ntitle: Release notes\n---\n\nBody");
    const closingFrom = editor.content.lastIndexOf("---");

    editor.view.dispatch({
      changes: { from: closingFrom, to: closingFrom + 3, insert: "" },
    });
    editor.view.dispatch({ selection: { anchor: editor.content.length } });

    expect(countNodes("Frontmatter")).toBe(0);
    expect(countNodes("HorizontalRule")).toBeGreaterThan(0);
    expect(editor.view.dom.querySelector(".inksane-frontmatter-widget")).toBeNull();
  });

  it("reports the block as active through state queries", () => {
    mount(CONTENT);

    editor.view.dispatch({ selection: { anchor: editor.content.indexOf("title") } });
    expect(editor.isActive("frontmatter")).toBe(true);

    editor.view.dispatch({ selection: { anchor: editor.content.length } });
    expect(editor.isActive("frontmatter")).toBe(false);
  });
});

describe("getYaml", () => {
  let editor: Editor;

  afterEach(() => editor?.destroy());

  it("returns the parsed frontmatter values", () => {
    editor = new Editor({ content: CONTENT, extensions: [FrontmatterExtension] });

    expect(getYaml(editor)).toEqual({
      title: "Release notes",
      draft: false,
      tags: ["docs", "editor"],
      author: { name: "Ada", role: "Writer" },
    });
  });

  it("returns an empty object for an empty block", () => {
    editor = new Editor({ content: "---\n---\n\nBody", extensions: [FrontmatterExtension] });

    expect(getYaml(editor)).toEqual({});
  });

  it("returns null when the document has no frontmatter", () => {
    editor = new Editor({ content: "# Title\n\nBody", extensions: [FrontmatterExtension] });

    expect(getYaml(editor)).toBeNull();
  });

  it("returns null when the YAML is invalid", () => {
    editor = new Editor({
      content: "---\ntitle: [unclosed\n---",
      extensions: [FrontmatterExtension],
    });

    expect(getYaml(editor)).toBeNull();
  });

  it("rejects recursive YAML aliases", () => {
    editor = new Editor({
      content: "---\na: &a\n  self: *a\n---",
      extensions: [FrontmatterExtension],
    });

    expect(getYaml(editor)).toBeNull();
  });

  it("converts YAML-specific values to plain JSON", () => {
    editor = new Editor({
      content:
        "---\nwhen: !!timestamp 2024-01-02\ntags: !!set {a: null, b: null}\nomap: !!omap [{a: 1}]\n---",
      extensions: [FrontmatterExtension],
    });

    expect(getYaml(editor)).toEqual({
      when: "2024-01-02T00:00:00.000Z",
      tags: ["a", "b"],
      omap: { a: 1 },
    });
  });

  it("turns binary data and non-finite numbers into JSON-safe values", () => {
    editor = new Editor({
      content: "---\nfile: !!binary aGk=\nhigh: .inf\nlow: -.inf\nmissing: .nan\n---",
      extensions: [FrontmatterExtension],
    });

    expect(getYaml(editor)).toEqual({
      file: [104, 105],
      high: null,
      low: null,
      missing: null,
    });
  });

  it("rejects recursive arrays", () => {
    editor = new Editor({
      content: "---\nlist: &list [*list]\n---",
      extensions: [FrontmatterExtension],
    });

    expect(getYaml(editor)).toBeNull();
  });

  it("rejects a top-level list", () => {
    editor = new Editor({
      content: "---\n- one\n- two\n---",
      extensions: [FrontmatterExtension],
    });

    expect(getYaml(editor)).toBeNull();
  });
});
