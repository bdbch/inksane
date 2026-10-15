import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import { EditorView, type WidgetType } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import type { BlockParser, InlineParser, MarkdownConfig } from "@lezer/markdown";
import { escapeHtml } from "../helpers/escapeHtml.ts";
import { htmlWidget } from "../helpers/htmlWidget.ts";
import type { Extension } from "../types/index.ts";

const REFERENCE_CLASS = "inksane-footnote-ref";
const DEFINITION_MARKER_CLASS = "inksane-footnote-marker";
const DEFINITION_CLASS = "inksane-footnote-definition";
const DEFINITION_LINE_CLASS = "inksane-footnote-definition-line";

const DEFINITION_START = /^\[\^([^\]\n]+)\]:[ \t]?/;

/** Reads the label of a `FootnoteReference` or `FootnoteDefinition` node. */
const getLabel = (node: SyntaxNode, state: EditorState): string => {
  const label = node.getChild("FootnoteLabel");
  return label ? state.doc.sliceString(label.from, label.to) : "";
};

/** Finds the definition with the matching label, for a reference to jump to. */
const findDefinition = (state: EditorState, label: string): { from: number } | null => {
  let from: number | null = null;

  syntaxTree(state).iterate({
    enter(node) {
      if (from !== null || node.name !== "FootnoteDefinition") return;
      if (getLabel(node.node, state) === label) {
        from = node.from;
        return false;
      }
    },
  });

  return from === null ? null : { from };
};

/** Builds the superscript widget shown for a footnote reference. */
const createReferenceWidget = (label: string): WidgetType => {
  return htmlWidget(
    `<sup class="${REFERENCE_CLASS}" role="doc-noteref" data-footnote-id="${escapeHtml(label)}" title="Go to footnote ${escapeHtml(label)}">${escapeHtml(label)}</sup>`,
    {
      onRender: (element, view) => {
        const jump = (event: MouseEvent) => {
          event.preventDefault();
          const target = findDefinition(view.state, label);
          if (!target) return;
          view.dispatch({
            selection: { anchor: target.from },
            effects: EditorView.scrollIntoView(target.from, { y: "center" }),
            userEvent: "select.footnote",
          });
          view.focus();
        };

        element.addEventListener("mousedown", (event) => event.preventDefault());
        element.addEventListener("click", jump);
      },
    },
  );
};

/** Builds the identifier widget shown at the start of a footnote definition. */
const createDefinitionWidget = (label: string): WidgetType => {
  return htmlWidget(
    `<sup class="${DEFINITION_MARKER_CLASS}" data-footnote-id="${escapeHtml(label)}">${escapeHtml(label)}</sup>`,
  );
};

/** ASCII code for `[`, so non-bracket characters skip the slice below. */
const OPEN_BRACKET = "[".charCodeAt(0);

/** `[^label]`, but not when a link target follows (`[^x](url)`, `[^x][ref]`). */
const REFERENCE = /^\[\^([^[\]\n]+)\](?!\(|\[)/;

const footnoteReferenceParser: InlineParser = {
  name: "FootnoteReference",
  before: "Link",
  parse(cx, next, pos) {
    if (next !== OPEN_BRACKET) return -1;

    const match = REFERENCE.exec(cx.slice(pos, cx.end));
    if (!match) return -1;

    const to = pos + match[0].length;
    return cx.addElement(
      cx.elt("FootnoteReference", pos, to, [cx.elt("FootnoteLabel", pos + 2, to - 1)]),
    );
  },
};

const footnoteDefinitionParser: BlockParser = {
  name: "FootnoteDefinition",
  before: "LinkReference",
  parse(cx, line) {
    const match = DEFINITION_START.exec(line.text.slice(line.pos));
    if (!match) return false;

    const from = cx.lineStart + line.pos;
    const to = cx.lineStart + line.text.length;
    const label = match[1];
    const bodyStart = line.pos + match[0].length;

    const element = cx.elt("FootnoteDefinition", from, to, [
      cx.elt("FootnoteMark", from, from + label.length + 4),
      cx.elt("FootnoteLabel", from + 2, from + 2 + label.length),
      ...cx.parser.parseInline(line.text.slice(bodyStart), cx.lineStart + bodyStart),
    ]);

    cx.nextLine();
    cx.addElement(element);
    return true;
  },
};

const footnotesSyntax: MarkdownConfig = {
  defineNodes: [
    { name: "FootnoteDefinition", block: true },
    "FootnoteReference",
    "FootnoteLabel",
    "FootnoteMark",
  ],
  parseInline: [footnoteReferenceParser],
  parseBlock: [footnoteDefinitionParser],
};

/** Strips the wrappers browsers add around footnote ids to compare labels. */
const normalizeId = (value: string): string =>
  value
    .trim()
    .replace(/^#/, "")
    .replace(/^user-content-/, "")
    .replace(/^fn(ref)?-?/, "");

const isReferenceElement = (element: Element): boolean => {
  if (element.getAttribute("role") === "doc-noteref") return true;
  if (element.tagName.toLowerCase() !== "sup") return false;
  return (
    element.querySelector('a[href^="#fn"], a[href^="#user-content-fn"], a[href^="#footnote"]') !==
    null
  );
};

const isDefinitionElement = (element: Element): boolean => {
  if (element.getAttribute("role") === "doc-endnote") return true;
  return (
    element.tagName.toLowerCase() === "li" &&
    element.closest('[role="doc-endnotes"], .footnotes') !== null
  );
};

/** Adds footnote syntax, decorations, HTML pasting, and reference jumping. */
export const FootnoteExtension: Extension = {
  name: "footnotes",

  addMarkdownSyntax() {
    return [footnotesSyntax];
  },

  addMarkdownDecorations() {
    return [
      {
        nodeName: "FootnoteReference",
        hideSyntax: true,
        markup: (node) => [{ from: node.from, to: node.to }],
        widgets: [
          {
            kind: "replace",
            type: (node, state) => createReferenceWidget(getLabel(node, state)),
          },
        ],
      },
      {
        nodeName: "FootnoteDefinition",
        className: DEFINITION_CLASS,
        lineClass: DEFINITION_LINE_CLASS,
        hideSyntax: true,
        widgets: [
          {
            kind: "replace",
            type: (node, state) => createDefinitionWidget(getLabel(node, state)),
          },
        ],
      },
    ];
  },

  addStateQueries() {
    return [
      { name: "footnoteReference", nodeNames: ["FootnoteReference"] },
      { name: "footnoteDefinition", kind: "node", nodeNames: ["FootnoteDefinition"] },
    ];
  },

  addHtmlConverters() {
    return [
      {
        match: isReferenceElement,
        toMarkdown: (element) => {
          const source =
            element.getAttribute("data-footnote-id") ??
            element.querySelector("a")?.getAttribute("href") ??
            element.textContent ??
            "";
          return `[^${normalizeId(source)}]`;
        },
      },
      {
        block: true,
        match: isDefinitionElement,
        toMarkdown: (element, { renderChildren }) => {
          const source =
            element.getAttribute("data-footnote-id") ?? element.getAttribute("id") ?? "";
          return `[^${normalizeId(source)}]: ${renderChildren(element).trim()}`;
        },
      },
    ];
  },
};
