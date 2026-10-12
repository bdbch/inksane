import { htmlWidget } from "../helpers/htmlWidget.ts";
import { resolveFromTo } from "../helpers/resolveFromTo.ts";
import type { Extension, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    horizontalRule: {
      /**
       * Inserts a horizontal rule (---) at the given position or range, otherwise at the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      insertHorizontalRule: (options?: { pos?: PosOrRange }) => ReturnType;
    };
  }
}

export const HorizontalRuleExtension: Extension = {
  name: "horizontalRule",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "HorizontalRule",
        className: "inksane-mark-horizontal-rule",
        hideSyntax: true,
        markup: (node) => [{ from: node.from, to: node.to }],
        widgets: [
          {
            kind: "replace",
            type: () => htmlWidget('<hr class="inksane-hr">', { estimatedHeight: 17 }),
          },
        ],
      },
    ];
  },

  addHtmlConverters() {
    return [
      {
        block: true,
        match: (element) => element.tagName.toLowerCase() === "hr",
        toMarkdown: () => "---",
      },
    ];
  },

  addCommands() {
    return {
      insertHorizontalRule: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        if (from < 0 || from > to || to > ctx.state.doc.length) return false;

        const line = ctx.state.doc.lineAt(from);
        const content = line.text.trim() ? "\n\n---\n\n" : "\n---\n\n";
        ctx.dispatch({
          changes: { from, to, insert: content },
          selection: { anchor: from + content.length, head: from + content.length },
        });
        return true;
      },
    };
  },

  addKeybinds(ctx) {
    return [
      {
        key: "Mod-Shift--",
        run() {
          return ctx.editor.commands.insertHorizontalRule();
        },
      },
    ];
  },
};
