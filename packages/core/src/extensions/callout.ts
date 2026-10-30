import type { EditorState } from "@codemirror/state";
import type { WidgetType } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import type { InlineParser, MarkdownConfig } from "@lezer/markdown";
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

/** ASCII code for `[`, so other characters skip the slice below. */
const OPEN_BRACKET = "[".charCodeAt(0);

/** `[!type]`, but not when a link target or reference follows. */
const CALLOUT_MARKER = /^\[![A-Za-z][A-Za-z0-9-]*\](?!\(|\[)/;

const calloutMarkerParser: InlineParser = {
  name: "CalloutMarker",
  before: "Link",
  parse(cx, next, pos) {
    if (next !== OPEN_BRACKET) return -1;

    const match = CALLOUT_MARKER.exec(cx.slice(pos, cx.end));
    if (!match) return -1;

    return cx.addElement(cx.elt("CalloutMarker", pos, pos + match[0].length));
  },
};

const calloutSyntax: MarkdownConfig = {
  defineNodes: ["CalloutMarker"],
  parseInline: [calloutMarkerParser],
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

/** Reads a callout from the first line of a blockquote. */
function readCallout(node: SyntaxNode, state: EditorState): CalloutInfo | null {
  const line = state.doc.lineAt(node.from);
  const source = state.doc.sliceString(node.from, line.to);
  const quoteMark = /^>[ \t]*/.exec(source);
  const markerFrom = node.from + (quoteMark?.[0].length ?? 0);
  const match = /^\[!([A-Za-z][A-Za-z0-9-]*)\](?:[ \t]+(.*?))?[ \t]*$/.exec(
    source.slice(quoteMark?.[0].length ?? 0),
  );
  if (!match) return null;

  const type = match[1].toLowerCase();
  const title = match[2]?.trim() || CALLOUT_TITLES.get(type) || titleCase(type);

  return {
    type,
    style: CALLOUT_STYLES.get(type) ?? type,
    title,
    markerFrom,
    lineTo: line.to,
  };
}

function createCalloutWidget(callout: CalloutInfo): WidgetType {
  const html = `<span class="inksane-callout-title inksane-callout-title--${callout.style}" data-callout-type="${escapeHtml(callout.type)}">${escapeHtml(callout.title)}</span>`;

  return htmlWidget(html, {
    className: "inksane-callout-header",
    onRender: (element, view) => {
      element.addEventListener("mousedown", (event) => event.preventDefault());
      element.addEventListener("click", () => {
        view.dispatch({
          selection: { anchor: callout.markerFrom },
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
        lineClass: (node, state) => {
          const callout = readCallout(node, state);
          return callout ? `inksane-callout inksane-callout--${callout.style}` : null;
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
