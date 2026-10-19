import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  HighlightStyle,
  ensureSyntaxTree,
  LanguageDescription,
  syntaxTree,
} from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { highlightTree, tags } from "@lezer/highlight";
import { Editor } from "../Editor.ts";
import { buildCodeHighlightDecorations, styleApplies } from "../helpers/codeHighlight.ts";
import { codeHighlightStyle } from "../helpers/codeHighlightStyle.ts";
import { defaultCodeLanguages } from "../helpers/defaultCodeLanguages.ts";
import type { Extension } from "../types/index.ts";
import { BaseKit } from "./baseKit.ts";
import { CodeExtension } from "./code.ts";

const languageFor = (name: string) => {
  const language = defaultCodeLanguages.find((description) => description.alias.includes(name));
  if (!language) throw new Error(`Missing default language: ${name}`);
  return language;
};

const nestedNodeAt = (editor: Editor, text: string) => {
  const pos = editor.content.indexOf(text);
  return syntaxTree(editor.state).resolveInner(pos, 1).name;
};

const codeHighlightPositions = (editor: Editor) => {
  const positions: number[] = [];
  const decorations = buildCodeHighlightDecorations(
    editor.state,
    [{ from: 0, to: editor.state.doc.length }],
    codeHighlightStyle,
  );
  decorations.between(0, editor.state.doc.length, (from) => {
    positions.push(from);
  });
  return positions;
};

const hasHighlightedToken = (editor: Editor, from: number, to: number) => {
  const tree = ensureSyntaxTree(editor.state, editor.state.doc.length, 5000);
  if (!tree) return false;
  let found = false;
  highlightTree(
    tree,
    codeHighlightStyle,
    (tokenFrom, _tokenTo, className) => {
      if (className && tokenFrom >= from && tokenFrom < to) found = true;
    },
    from,
    to,
  );
  return found;
};

describe("CodeExtension", () => {
  let editor: Editor | undefined;

  afterEach(() => editor?.destroy());

  it("registers the default languages", () => {
    expect(defaultCodeLanguages.map((language) => language.name)).toEqual([
      "JavaScript",
      "TypeScript",
      "TSX",
      "HTML",
      "CSS",
      "JSON",
      "YAML",
      "TOML",
      "Shell",
      "Python",
      "SQL",
      "XML",
      "Go",
      "Rust",
      "Java",
      "C/C++",
      "PHP",
      "Diff",
      "Dockerfile",
      "Markdown",
    ]);
  });

  it("loads every default language", async () => {
    const supports = await Promise.all(defaultCodeLanguages.map((language) => language.load()));

    expect(supports.every((support) => support.language)).toBe(true);
  });

  it("matches aliases and rejects unknown languages", () => {
    expect(LanguageDescription.matchLanguageName(defaultCodeLanguages, "ts", false)?.name).toBe(
      "TypeScript",
    );
    expect(LanguageDescription.matchLanguageName(defaultCodeLanguages, "js", false)?.name).toBe(
      "JavaScript",
    );
    expect(LanguageDescription.matchLanguageName(defaultCodeLanguages, "sh", false)?.name).toBe(
      "Shell",
    );
    expect(LanguageDescription.matchLanguageName(defaultCodeLanguages, "py", false)?.name).toBe(
      "Python",
    );
    expect(LanguageDescription.matchLanguageName(defaultCodeLanguages, "yml", false)?.name).toBe(
      "YAML",
    );
    expect(LanguageDescription.matchLanguageName(defaultCodeLanguages, "jsonc", false)).toBeNull();
    expect(
      LanguageDescription.matchLanguageName(defaultCodeLanguages, "unknown", false),
    ).toBeNull();
  });

  it("parses fenced code with the matching language", async () => {
    await languageFor("ts").load();

    editor = new Editor({
      element: document.createElement("div"),
      content: "```ts\nconst value = 1\n```",
      extensions: [CodeExtension()],
    });

    expect(nestedNodeAt(editor, "value")).toBe("VariableDefinition");
  });

  it("parses TypeScript without JSX", async () => {
    await languageFor("ts").load();

    editor = new Editor({
      element: document.createElement("div"),
      content: "```ts\nconst id = <T>(value: T) => value;\nlet text = <string>value;\n```",
      extensions: [CodeExtension()],
    });

    const tree = ensureSyntaxTree(editor.state, editor.state.doc.length, 5000);
    let invalid = 0;
    tree?.iterate({
      enter: (node) => {
        if (node.name === "⚠") invalid++;
      },
    });

    expect(invalid).toBe(0);
  });

  it("parses TSX with JSX", async () => {
    await languageFor("tsx").load();

    editor = new Editor({
      element: document.createElement("div"),
      content: "```tsx\nconst element = <div />;\n```",
      extensions: [CodeExtension()],
    });

    expect(nestedNodeAt(editor, "<div")).toContain("Tag");
  });

  it("only highlights code block content", async () => {
    await languageFor("ts").load();

    editor = new Editor({
      element: document.createElement("div"),
      content: "[title](https://example.com)\n\n# Heading\n\n```ts\nconst value = 1;\n```",
      extensions: [CodeExtension()],
    });

    const codeStart = editor.content.indexOf("const value");
    expect(codeHighlightPositions(editor).filter((position) => position < codeStart)).toEqual([]);
    expect(codeHighlightPositions(editor).some((position) => position >= codeStart)).toBe(true);
  });

  it("uses a custom highlight style", async () => {
    await languageFor("ts").load();
    const style = HighlightStyle.define([
      { tag: tags.keyword, class: "custom-keyword" },
      { tag: tags.string, color: "rgb(1, 2, 3)" },
    ]);

    editor = new Editor({
      element: document.createElement("div"),
      content: "```ts\nconst value = 1;\n```",
      extensions: [CodeExtension({ highlightStyle: style })],
    });

    const decorations = buildCodeHighlightDecorations(
      editor.state,
      [{ from: 0, to: editor.state.doc.length }],
      style,
    );
    const classes = new Set<string>();
    decorations.between(0, editor.state.doc.length, (_from, _to, value) => {
      if (value.spec.class) classes.add(value.spec.class);
    });

    expect(classes.has("custom-keyword")).toBe(true);
    expect(document.head.textContent).toContain("rgb(1, 2, 3)");
  });

  it("leaves code plain when no language matches", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "```unknown\nconst value = 1;\n```",
      extensions: [CodeExtension()],
    });

    expect(codeHighlightPositions(editor)).toEqual([]);
  });

  it("leaves code plain with an empty language list", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "```ts\nconst value = 1;\n```",
      extensions: [CodeExtension({ languages: [] })],
    });

    expect(codeHighlightPositions(editor)).toEqual([]);
  });

  it("respects theme-scoped styles", () => {
    const dark = HighlightStyle.define([], { themeType: "dark" });
    const light = HighlightStyle.define([], { themeType: "light" });
    const darkState = EditorState.create({ extensions: [EditorView.darkTheme.of(true)] });
    const lightState = EditorState.create({ extensions: [EditorView.darkTheme.of(false)] });

    expect(styleApplies(darkState, dark)).toBe(true);
    expect(styleApplies(darkState, light)).toBe(false);
    expect(styleApplies(lightState, light)).toBe(true);
  });

  it("applies highlight classes to parsed tokens", async () => {
    await languageFor("ts").load();

    editor = new Editor({
      element: document.createElement("div"),
      content: "```ts\nconst value = 1\n```",
      extensions: [CodeExtension()],
    });

    const tree = ensureSyntaxTree(editor.state, editor.state.doc.length, 5000);
    const classes = new Set<string>();
    if (tree) {
      highlightTree(tree, codeHighlightStyle, (_from, _to, className) => {
        if (className) classes.add(className);
      });
    }

    expect(classes.size).toBeGreaterThan(0);
  });

  it("highlights the web languages", async () => {
    const blocks = [
      ["html", '<div class="card">Hello</div>'],
      ["css", ".card { color: red; }"],
      ["js", "const value = 1;"],
      ["json", '{"name": "inksane"}'],
    ] as const;
    await Promise.all(blocks.map(([name]) => languageFor(name).load()));

    editor = new Editor({
      element: document.createElement("div"),
      content: blocks.map(([name, body]) => `\`\`\`${name}\n${body}\n\`\`\``).join("\n\n"),
      extensions: [CodeExtension()],
    });

    for (const [, body] of blocks) {
      const from = editor.content.indexOf(body);
      expect(hasHighlightedToken(editor, from, from + body.length)).toBe(true);
    }
  });

  it("parses legacy stream languages", async () => {
    const support = await languageFor("sh").load();
    expect(support).toBeDefined();

    editor = new Editor({
      element: document.createElement("div"),
      content: "```sh\necho $HOME\n```",
      extensions: [CodeExtension()],
    });

    const tree = ensureSyntaxTree(editor.state, editor.state.doc.length, 5000);
    const classes = new Set<string>();
    if (tree) {
      highlightTree(tree, codeHighlightStyle, (_from, _to, className) => {
        if (className) classes.add(className);
      });
    }

    expect(classes.size).toBeGreaterThan(0);
  });

  it("skips parsing when the language list does not match", async () => {
    const support = await languageFor("ts").load();

    editor = new Editor({
      element: document.createElement("div"),
      content: "```ts\nconst value = 1\n```",
      extensions: [
        CodeExtension({
          languages: [LanguageDescription.of({ name: "Custom", alias: ["custom"], support })],
        }),
      ],
    });

    expect(nestedNodeAt(editor, "value")).not.toBe("VariableDefinition");
  });

  it("loads a language only when a fence uses it", async () => {
    const support = await languageFor("ts").load();
    const load = vi.fn(() => Promise.resolve(support));
    const custom = LanguageDescription.of({ name: "Custom", alias: ["custom"], load });

    editor = new Editor({
      element: document.createElement("div"),
      content: "```custom\nconst value = 1\n```",
      extensions: [CodeExtension({ languages: [custom] })],
    });

    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
  });

  it("does not load a language that no fence uses", async () => {
    const support = await languageFor("ts").load();
    const load = vi.fn(() => Promise.resolve(support));
    const custom = LanguageDescription.of({ name: "Custom", alias: ["custom"], load });

    editor = new Editor({
      element: document.createElement("div"),
      content: "```ts\nconst value = 1\n```",
      extensions: [CodeExtension({ languages: [custom] })],
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(load).not.toHaveBeenCalled();
  });

  it("passes code language options through BaseKit", async () => {
    const support = await languageFor("ts").load();
    const custom = LanguageDescription.of({ name: "Custom", alias: ["custom"], support });

    editor = new Editor({
      element: document.createElement("div"),
      content: "```custom\nconst value = 1\n```",
      extensions: [BaseKit({ code: { languages: [custom] } })],
    });

    expect(nestedNodeAt(editor, "value")).toBe("VariableDefinition");
  });

  it("lets extensions add code languages", async () => {
    const support = await languageFor("ts").load();
    const custom = LanguageDescription.of({ name: "Custom", alias: ["custom"], support });
    const customLanguages: Extension = {
      name: "customCodeLanguages",
      addMarkdownCodeLanguages: () => [custom],
    };

    editor = new Editor({
      element: document.createElement("div"),
      content: "```custom\nconst value = 1\n```",
      extensions: [CodeExtension({ languages: [] }), customLanguages],
    });

    expect(nestedNodeAt(editor, "value")).toBe("VariableDefinition");
  });
});
