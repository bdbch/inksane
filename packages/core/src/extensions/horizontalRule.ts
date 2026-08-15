import { WidgetType } from "@codemirror/view";
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

/** Renders an actual `<hr>` in place of the hidden `---` syntax. */
class HorizontalRuleWidget extends WidgetType {
  toDOM() {
    const dom = document.createElement("hr");
    dom.className = "inksane-hr";
    return dom;
  }

  get estimatedHeight() {
    return 17;
  }

  eq(other: WidgetType) {
    return other instanceof HorizontalRuleWidget;
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
        widgets: [{ kind: "replace", type: new HorizontalRuleWidget() }],
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
