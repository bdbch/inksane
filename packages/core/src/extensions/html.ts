import { htmlWidget } from "../helpers/htmlWidget.ts";
import { sanitizeHtml } from "../helpers/sanitizeHtml.ts";
import type { Extension } from "../types/index.ts";

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
                className: "inksane-html-block",
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
};
