import { syntaxTree } from "@codemirror/language";
import type { EditorState, Line } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { htmlWidget } from "../helpers/htmlWidget.ts";
import { sanitizeHtml } from "../helpers/sanitizeHtml.ts";
import type { Extension } from "../types/index.ts";

const HTML_BLOCK_NODE = "HTMLBlock";

/** Finds an HTML block whose source starts or ends on the given line. */
function findHtmlBlock(
  state: EditorState,
  line: Line,
  edge: "start" | "end",
): { from: number; to: number } | null {
  let match: { from: number; to: number } | null = null;

  syntaxTree(state).iterate({
    from: line.from,
    to: line.to,
    enter(node) {
      if (node.name !== HTML_BLOCK_NODE) return;
      const pos = edge === "start" ? node.from : node.to;
      if (pos >= line.from && pos <= line.to) {
        match = { from: node.from, to: node.to };
        return false;
      }
    },
  });

  return match;
}

/**
 * Moves the cursor into an adjacent hidden HTML block, so its source shows.
 * A block is one block-level replace widget, so normal vertical motion skips
 * it. Returns false when there is no block to enter and the key stays native.
 */
function enterAdjacentHtmlBlock(view: EditorView, direction: 1 | -1): boolean {
  const selection = view.state.selection.main;
  if (!selection.empty) return false;

  const doc = view.state.doc;
  const target = doc.lineAt(selection.head).number + direction;
  if (target < 1 || target > doc.lines) return false;

  const line = doc.line(target);
  const node = findHtmlBlock(view.state, line, direction === 1 ? "start" : "end");
  if (!node) return false;

  view.dispatch({ selection: { anchor: direction === 1 ? node.from : node.to } });
  return true;
}

/** Renders block-level HTML from the document and hides HTML comments. */
export const HtmlExtension: Extension = {
  name: "html",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "HTMLBlock",
        className: "inksane-mark-html",
        hideSyntax: true,
        markup: (node) => [{ from: node.from, to: node.to }],
        widgets: [
          {
            kind: "replace",
            block: true,
            type: (node, state) => {
              const from = node.from;
              return htmlWidget(sanitizeHtml(state.sliceDoc(node.from, node.to)), {
                block: true,
                className: "inksane-html-block cm-line",
                onRender: (element, view) => {
                  element.addEventListener("mousedown", (event) => {
                    event.preventDefault();
                    view.focus();
                    view.dispatch({ selection: { anchor: from } });
                  });
                },
              });
            },
          },
        ],
      },
      {
        nodeName: "Comment",
        hideSyntax: true,
        markup: (node) => [{ from: node.from, to: node.to }],
        widgets: [{ kind: "replace", type: () => htmlWidget("") }],
      },
    ];
  },

  addStateQueries() {
    return [{ name: "htmlBlock", kind: "node", nodeNames: ["HTMLBlock"] }];
  },

  addKeybinds({ editor }) {
    return [
      {
        key: "ArrowDown",
        run() {
          return enterAdjacentHtmlBlock(editor.view, 1);
        },
      },
      {
        key: "ArrowUp",
        run() {
          return enterAdjacentHtmlBlock(editor.view, -1);
        },
      },
    ];
  },
};
