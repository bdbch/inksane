import { syntaxTree } from "@codemirror/language";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import { BaseKit } from "./baseKit.ts";
import { DefinitionListExtension } from "./definitionList.ts";

describe("definition lists", () => {
  let editor: Editor | undefined;

  afterEach(() => editor?.destroy());

  it("parses terms and definitions with separate decorations", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "Intro\n\nTerm\n: First definition\n: Second definition",
      extensions: [DefinitionListExtension],
    });

    const names: string[] = [];
    syntaxTree(editor.state).iterate({
      enter(node) {
        names.push(node.name);
      },
    });

    expect(names).toContain("DefinitionList");
    expect(names).toContain("DefinitionTerm");
    expect(names.filter((name) => name === "Definition")).toHaveLength(2);
    expect(editor.view.contentDOM.querySelector(".inksane-definition-term")).not.toBeNull();
    expect(editor.view.contentDOM.querySelectorAll(".inksane-definition")).toHaveLength(2);
    expect(editor.view.contentDOM.textContent).toBe("IntroTermFirst definitionSecond definition");
  });

  it("consumes the full list and leaves the following paragraph intact", () => {
    const content = "Term\n: Definition\n\nAfter";
    const instance = new Editor({ content, extensions: [DefinitionListExtension] });
    editor = instance;
    const tree = syntaxTree(instance.state);

    const nodes: { name: string; from: number; to: number }[] = [];
    tree.iterate({
      enter(node) {
        if (node.node.parent?.name === tree.topNode.name) {
          nodes.push({ name: node.name, from: node.from, to: node.to });
        }
      },
    });

    const definitionList = nodes.find((node) => node.name === "DefinitionList");
    expect(definitionList?.to).toBe(content.indexOf("\n\n"));
    expect(
      nodes.some((node) => node.name === "Paragraph" && node.from >= content.indexOf("After")),
    ).toBe(true);
  });

  it("keeps a colon at the start of definition content", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "Term\n: :",
      extensions: [DefinitionListExtension],
    });

    expect(editor.view.contentDOM.textContent).toBe("Term:");
  });

  it("converts pasted definition list HTML", () => {
    editor = new Editor({
      element: document.createElement("div"),
      extensions: [BaseKit()],
    });
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) =>
          type === "text/html" ? "<dl><dt>Term</dt><dd>Definition</dd></dl>" : "",
      },
    });

    editor.view.contentDOM.dispatchEvent(event);

    expect(editor.content).toBe("Term\n: Definition");
  });

  it("preserves terms that share a definition when converting HTML", () => {
    editor = new Editor({ element: document.createElement("div"), extensions: [BaseKit()] });
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) =>
          type === "text/html" ? "<dl><dt>First</dt><dt>Second</dt><dd>Meaning</dd></dl>" : "",
      },
    });

    editor.view.contentDOM.dispatchEvent(event);

    expect(editor.content).toBe("First\n: Meaning\n\nSecond\n: Meaning");
  });

  it("converts paragraphs inside an HTML definition into Markdown definitions", () => {
    editor = new Editor({ element: document.createElement("div"), extensions: [BaseKit()] });
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) =>
          type === "text/html"
            ? "<dl><dt>Term</dt><dd><p>First paragraph</p><p>Second paragraph</p></dd></dl>"
            : "",
      },
    });

    editor.view.contentDOM.dispatchEvent(event);

    expect(editor.content).toBe("Term\n: First paragraph\n: Second paragraph");
  });

  it("keeps HTML line breaks inside definition lines", () => {
    editor = new Editor({ element: document.createElement("div"), extensions: [BaseKit()] });
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) =>
          type === "text/html" ? "<dl><dt>Term</dt><dd>First<br>Second</dd></dl>" : "",
      },
    });

    editor.view.contentDOM.dispatchEvent(event);

    expect(editor.content).toBe("Term\n: First\n: Second");
  });

  it("normalizes HTML line breaks inside terms", () => {
    editor = new Editor({ element: document.createElement("div"), extensions: [BaseKit()] });
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) =>
          type === "text/html" ? "<dl><dt>First<br>Second</dt><dd>Meaning</dd></dl>" : "",
      },
    });

    editor.view.contentDOM.dispatchEvent(event);

    expect(editor.content).toBe("First Second\n: Meaning");
    expect(editor.view.contentDOM.querySelector(".inksane-definition-term")).not.toBeNull();
  });

  it("can be disabled in BaseKit", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "Term\n: Definition",
      extensions: [BaseKit({ definitionList: false })],
    });

    expect(editor.view.contentDOM.querySelector(".inksane-definition-term")).toBeNull();
  });
});
