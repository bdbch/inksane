import type { EditorState } from "@codemirror/state";
import { WidgetType } from "@codemirror/view";
import { insertContent } from "../commands/index.ts";
import type { InkwellExtension, PosOrRange } from "../types/index.ts";

declare module "@inkwell/core" {
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
    dom.className = "inkwell-hr";
    return dom;
  }

  get estimatedHeight() {
    return 17;
  }

  eq(other: WidgetType) {
    return other instanceof HorizontalRuleWidget;
  }
}

const resolveFromTo = (state: EditorState, pos?: PosOrRange): { from: number; to: number } => {
  const from = typeof pos === "number" ? pos : (pos?.from ?? state.selection.main.from);
  const to = typeof pos === "number" ? pos : (pos?.to ?? state.selection.main.to);
  return { from, to };
};

export const HorizontalRuleExtension: InkwellExtension = {
  name: "horizontalRule",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "HorizontalRule",
        className: "inkwell-mark-horizontal-rule",
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
        return insertContent(ctx)({ content: "---", from, to });
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
