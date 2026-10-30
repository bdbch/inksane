import { syntaxTree } from "@codemirror/language";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import { BaseKit } from "./baseKit.ts";
import { BlockquoteExtension } from "./blockquote.ts";
import { CalloutExtension } from "./callout.ts";
import { LinkExtension } from "./link.ts";

const OUTSIDE = "\n\nOutside";

describe("callouts", () => {
  const editors: Editor[] = [];
  const elements: HTMLElement[] = [];

  const mount = (content: string, extensions = [BlockquoteExtension, CalloutExtension]) => {
    const element = document.createElement("div");
    document.body.append(element);
    elements.push(element);

    const editor = new Editor({ element, content: `${content}${OUTSIDE}`, extensions });
    editors.push(editor);
    editor.view.focus();
    editor.view.dispatch({ selection: { anchor: editor.content.length } });
    return editor;
  };

  const findNode = (editor: Editor, name: string) => {
    let found = false;

    syntaxTree(editor.state).iterate({
      enter(node) {
        if (node.name === name) found = true;
      },
    });

    return found;
  };

  afterEach(() => {
    for (const instance of editors) instance.destroy();
    for (const element of elements) element.remove();
    editors.length = 0;
    elements.length = 0;
  });

  it("renders a titled callout instead of the source marker", () => {
    const editor = mount("> [!note] Read this\n> Body text");

    const title = editor.view.contentDOM.querySelector(".inksane-callout-title");

    expect(title?.textContent).toBe("Read this");
    expect(title?.getAttribute("data-callout-type")).toBe("note");
    expect(editor.view.contentDOM.querySelector(".cm-line.inksane-callout--note")).not.toBeNull();
    expect(editor.view.contentDOM.textContent).not.toContain("[!note]");
    expect(editor.view.contentDOM.textContent).toContain("Body text");
    expect(editor.getMarkdown()).toBe("> [!note] Read this\n> Body text\n\nOutside");
  });

  it("shows the type's default title when the callout has none", () => {
    const editor = mount("> [!tip]");

    expect(editor.view.contentDOM.querySelector(".inksane-callout-title")?.textContent).toBe("Tip");
  });

  it("maps type aliases to their shared style", () => {
    const editor = mount(
      "> [!warning] Careful\n\n> [!error] Boom\n\n> [!summary] Short\n\n> [!NOTE] Shout",
    );

    expect(editor.view.contentDOM.querySelector(".inksane-callout--warning")).not.toBeNull();
    expect(editor.view.contentDOM.querySelector(".inksane-callout--danger")).not.toBeNull();
    expect(editor.view.contentDOM.querySelector(".inksane-callout--abstract")).not.toBeNull();
    expect(editor.view.contentDOM.querySelector(".inksane-callout--note")).not.toBeNull();
  });

  it("escapes HTML in titles", () => {
    const editor = mount("> [!note] <img src=x onerror=alert(1)>");

    const title = editor.view.contentDOM.querySelector(".inksane-callout-title");

    expect(title?.textContent).toBe("<img src=x onerror=alert(1)>");
    expect(title?.querySelector("img")).toBeNull();
  });

  it("keeps unknown types as callouts with a generated title", () => {
    const editor = mount("> [!custom] Hello");

    expect(editor.view.contentDOM.querySelector(".inksane-callout--custom")).not.toBeNull();
    expect(editor.view.contentDOM.querySelector(".inksane-callout-title")?.textContent).toBe(
      "Hello",
    );
  });

  it("leaves plain blockquotes unchanged", () => {
    const editor = mount("> plain quote");

    expect(editor.view.contentDOM.querySelector(".inksane-callout")).toBeNull();
    expect(editor.view.contentDOM.textContent).toContain("plain quote");
  });

  it("recognizes a callout at the start of a nested blockquote", () => {
    const editor = mount("> > [!note] Deep\n> > Body text");

    expect(editor.view.contentDOM.querySelector(".inksane-callout-title")?.textContent).toBe(
      "Deep",
    );
  });

  it("recognizes a callout at the start of a blockquote inside a list", () => {
    const editor = mount("- > [!note] Nested\n  > Body text");

    expect(editor.view.contentDOM.querySelector(".inksane-callout-title")?.textContent).toBe(
      "Nested",
    );
  });

  it("does not treat an inline marker as a callout", () => {
    const editor = mount("Text [!note] here");

    expect(editor.view.contentDOM.querySelector(".inksane-callout-title")).toBeNull();
  });

  it("reveals the source while the selection is inside the callout", () => {
    const editor = mount("> [!note] Read this\n> Body text");
    expect(editor.view.contentDOM.querySelector(".inksane-callout-title")).not.toBeNull();

    editor.view.dispatch({ selection: { anchor: editor.content.indexOf("Body text") } });

    expect(editor.view.contentDOM.querySelector(".inksane-callout-title")).toBeNull();
    expect(editor.view.contentDOM.textContent).toContain("[!note] Read this");
  });

  it("edits the source while the selection is inside the callout", () => {
    const editor = mount("> [!note] Read this\n> Body text");
    const body = editor.content.indexOf("Body text");

    editor.view.dispatch({ selection: { anchor: body } });
    editor.commands.insertContent({ content: "New ", from: body });

    expect(editor.content).toContain("> [!note] Read this\n> New Body text");
  });

  it("moves the selection into the source when the title is clicked", () => {
    const editor = mount("> [!note] Read this\n> Body text");

    editor.view.contentDOM
      .querySelector(".inksane-callout-title")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(editor.state.selection.main.anchor).toBe(editor.content.indexOf("[!note]"));
    expect(editor.view.contentDOM.querySelector(".inksane-callout-title")).toBeNull();
  });

  it("moves the selection to the marker in indented, listed, and nested blockquotes", () => {
    for (const content of [
      "  > [!note] Read this\n  > Body text",
      "- > [!note] Read this\n  > Body text",
      "> > [!note] Read this\n> > Body text",
    ]) {
      const editor = mount(content);

      editor.view.contentDOM
        .querySelector(".inksane-callout-title")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(editor.state.selection.main.anchor).toBe(editor.content.indexOf("[!note]"));
    }
  });

  it("gives nested callout lines only the innermost type class", () => {
    const editor = mount("> [!warning] Outer\n> > [!tip] Inner\n> > Body text");
    const lines = Array.from(editor.view.contentDOM.querySelectorAll(".cm-line"));

    const outer = lines.find((line) => line.textContent?.includes("Outer"));
    const inner = lines.find((line) => line.textContent?.includes("Inner"));
    const body = lines.find((line) => line.textContent?.includes("Body text"));

    expect(outer?.classList.contains("inksane-callout--warning")).toBe(true);
    expect(inner?.classList.contains("inksane-callout--tip")).toBe(true);
    expect(inner?.classList.contains("inksane-callout--warning")).toBe(false);
    expect(body?.classList.contains("inksane-callout--tip")).toBe(true);
    expect(body?.classList.contains("inksane-callout--warning")).toBe(false);
  });

  it("uses the current marker position after edits above the callout", () => {
    const editor = mount("Before\n\n> [!note] Read this\n> Body text");
    expect(editor.content.indexOf("[!note]")).toBe(10);

    editor.view.dispatch({ changes: { from: 0, insert: "0123456789abc\n\n" } });
    expect(editor.content.indexOf("[!note]")).toBe(25);

    editor.view.contentDOM
      .querySelector(".inksane-callout-title")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(editor.state.selection.main.anchor).toBe(25);
  });

  it("keeps shortcut reference links working", () => {
    const editor = mount("[!note] is a link.\n\n[!note]: https://example.com", [
      BlockquoteExtension,
      CalloutExtension,
      LinkExtension(),
    ]);

    expect(findNode(editor, "Link")).toBe(true);
    expect(editor.getMarkdown()).toContain("[!note]: https://example.com");
  });

  it("keeps shortcut reference links inside later blockquote lines", () => {
    const editor = mount("> Intro [!note]\n>\n> [!note]: https://example.com", [
      BlockquoteExtension,
      CalloutExtension,
      LinkExtension(),
    ]);

    expect(findNode(editor, "Link")).toBe(true);
    expect(editor.view.contentDOM.querySelector(".inksane-callout")).toBeNull();
  });

  it("does not parse the marker as a link", () => {
    const editor = mount("> [!note] Read this\n> Body text", [
      BlockquoteExtension,
      CalloutExtension,
      LinkExtension(),
    ]);

    expect(findNode(editor, "Link")).toBe(false);
    expect(editor.view.contentDOM.querySelector(".inksane-mark-link")).toBeNull();
    expect(editor.view.contentDOM.querySelector(".inksane-callout-title")).not.toBeNull();
  });

  it("leaves a marker followed by a link target as a link", () => {
    const editor = mount("[!note](https://example.com)", [
      BlockquoteExtension,
      CalloutExtension,
      LinkExtension(),
    ]);

    expect(findNode(editor, "Link")).toBe(true);
  });

  it("is included in BaseKit and can be disabled", () => {
    const editor = mount("> [!note] Read this", [BaseKit()]);
    expect(editor.view.contentDOM.querySelector(".inksane-callout-title")?.textContent).toBe(
      "Read this",
    );

    const withoutCallouts = mount("> [!note] Read this", [BaseKit({ callout: false })]);
    expect(withoutCallouts.view.contentDOM.querySelector(".inksane-callout-title")).toBeNull();
  });
});
