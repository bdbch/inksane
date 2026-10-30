import { syntaxTree } from "@codemirror/language";
import type { EditorState, Line } from "@codemirror/state";
import type { EditorView, WidgetType } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import type { BlockContext, BlockParser, MarkdownConfig } from "@lezer/markdown";
import { escapeHtml } from "../helpers/escapeHtml.ts";
import { htmlWidget } from "../helpers/htmlWidget.ts";
import type { Extension, MarkupRange } from "../types/index.ts";

/** Aliases share the styling of their canonical type. */
const CALLOUT_STYLES = new Map<string, string>([
  ["note", "note"],
  ["abstract", "abstract"],
  ["summary", "abstract"],
  ["tldr", "abstract"],
  ["info", "info"],
  ["todo", "todo"],
  ["tip", "tip"],
  ["hint", "tip"],
  ["important", "important"],
  ["success", "success"],
  ["check", "success"],
  ["done", "success"],
  ["question", "question"],
  ["help", "question"],
  ["faq", "question"],
  ["warning", "warning"],
  ["caution", "warning"],
  ["attention", "warning"],
  ["failure", "failure"],
  ["fail", "failure"],
  ["missing", "failure"],
  ["danger", "danger"],
  ["error", "danger"],
  ["bug", "bug"],
  ["example", "example"],
  ["quote", "quote"],
  ["cite", "quote"],
]);

/** Default titles for types whose capitalization is not title case. */
const CALLOUT_TITLES = new Map<string, string>([
  ["tldr", "TL;DR"],
  ["faq", "FAQ"],
]);

/** A blockquote head like `[!note] Title`, without the quote marker. */
const CALLOUT_LINE = /^\[!([A-Za-z][A-Za-z0-9-]*)\](?:[ \t]+(.*?))?[ \t]*$/;

/** Lezer keeps the open parent block private, but its start marks the blockquote head. */
type BlockContextWithBlock = BlockContext & { block?: { from: number } };

/**
 * Consumes a callout head as its own block so Lezer does not parse
 * `[!note]` as a link. Normal links outside blockquotes stay untouched.
 */
const calloutHeadParser: BlockParser = {
  name: "CalloutHead",
  parse(cx, line) {
    if (cx.parentType().name !== "Blockquote") return false;

    // Only the first line of the blockquote can start a callout.
    const block = (cx as BlockContextWithBlock).block;
    if (!block || block.from < cx.lineStart || block.from > cx.lineStart + line.pos) return false;
    if (!CALLOUT_LINE.test(line.text.slice(line.pos))) return false;

    const from = cx.lineStart + line.pos;
    const to = cx.lineStart + line.text.length;
    cx.addElement(cx.elt("CalloutHead", from, to));
    cx.nextLine();
    return true;
  },
};

const calloutSyntax: MarkdownConfig = {
  defineNodes: [{ name: "CalloutHead", block: true }],
  parseBlock: [calloutHeadParser],
};

type CalloutInfo = {
  /** The type as written, lowercased. */
  type: string;
  /** The canonical type used for styling. */
  style: string;
  /** The explicit title, or the type's default title. */
  title: string;
  /** The start of the `[!type]` marker. */
  markerFrom: number;
  /** The end of the callout's first line. */
  lineTo: number;
};

const titleCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/** Reads the callout head child of a blockquote. */
function readCallout(node: SyntaxNode, state: EditorState): CalloutInfo | null {
  const head = node.getChild("CalloutHead");
  if (!head) return null;

  const match = CALLOUT_LINE.exec(state.doc.sliceString(head.from, head.to));
  if (!match) return null;

  const type = match[1].toLowerCase();
  const title = match[2]?.trim() || CALLOUT_TITLES.get(type) || titleCase(type);

  return {
    type,
    style: CALLOUT_STYLES.get(type) ?? type,
    title,
    markerFrom: head.from,
    lineTo: head.to,
  };
}

/** Finds the innermost callout blockquote that touches the line. */
function innermostCallout(state: EditorState, line: Line): SyntaxNode | null {
  let found: SyntaxNode | null = null;

  syntaxTree(state).iterate({
    from: line.from,
    to: line.to,
    enter(node) {
      if (node.name !== "Blockquote") return;
      if (node.from > line.to || node.to < line.from) return;
      if (!readCallout(node.node, state)) return;
      found = node.node;
    },
  });

  return found;
}

/** Reads the current marker position from the reused widget's DOM position. */
function markerFromWidget(view: EditorView, element: HTMLElement): number | null {
  let pos: number;
  try {
    pos = view.posAtDOM(element);
  } catch {
    return null;
  }

  const line = view.state.doc.lineAt(pos);
  let markerFrom: number | null = null;

  syntaxTree(view.state).iterate({
    from: line.from,
    to: line.to,
    enter(node) {
      if (node.name !== "CalloutHead") return;
      markerFrom = node.from;
      return false;
    },
  });

  return markerFrom;
}

function createCalloutWidget(callout: CalloutInfo): WidgetType {
  const html = `<span class="inksane-callout-title inksane-callout-title--${callout.style}" data-callout-type="${escapeHtml(callout.type)}">${escapeHtml(callout.title)}</span>`;

  return htmlWidget(html, {
    className: "inksane-callout-header",
    onRender: (element, view) => {
      element.addEventListener("mousedown", (event) => event.preventDefault());
      element.addEventListener("click", () => {
        const markerFrom = markerFromWidget(view, element);
        if (markerFrom === null) return;

        view.dispatch({
          selection: { anchor: markerFrom },
          userEvent: "select.callout",
        });
        view.focus();
      });
    },
  });
}

/**
 * Renders Obsidian-style callouts from blockquotes whose first line starts
 * with `[!type]`, for example `> [!note] Title`.
 *
 * Use it with `BlockquoteExtension` or `BaseKit` so the `>` markers are hidden.
 * The callout source becomes visible again while the selection is inside the block.
 */
export const CalloutExtension: Extension = {
  name: "callout",

  addMarkdownSyntax() {
    return [calloutSyntax];
  },

  addMarkdownDecorations() {
    return [
      {
        nodeName: "Blockquote",
        lineClass: (node, state, line) => {
          const callout = readCallout(node, state);
          if (!callout) return null;

          const innermost = innermostCallout(state, line);
          return innermost?.from === node.from
            ? `inksane-callout inksane-callout--${callout.style}`
            : null;
        },
        hideSyntax: true,
        markup: (node, state): MarkupRange[] => {
          const callout = readCallout(node, state);
          return callout ? [{ from: callout.markerFrom, to: callout.lineTo }] : [];
        },
        widgets: [
          {
            kind: "replace",
            type: (node, state) => {
              const callout = readCallout(node, state);
              return callout ? createCalloutWidget(callout) : null;
            },
          },
        ],
      },
    ];
  },
};
