import type { EditorState } from "@codemirror/state";
import { WidgetType } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { insertContent } from "../commands/index.ts";
import { markRangesWithWhitespace } from "../helpers/markup.ts";
import type { InkwellExtension, PosOrRange } from "../types/index.ts";

declare module "@inkwell/core" {
  interface Commands<ReturnType> {
    list: {
      /**
       * Toggles a bullet list for the line containing the given position or range, otherwise the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      toggleBulletList: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Toggles an ordered list for the line containing the given position or range, otherwise the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      toggleOrderedList: (options?: { pos?: PosOrRange }) => ReturnType;
    };
  }
}

const bulletMarker = /^[-*+]/;
const orderedMarker = /^\d+[.)]/;

const stripBulletMarker = (text: string) => text.replace(/^[-*+]\s?/, "");
const stripOrderedMarker = (text: string) => text.replace(/^\d+[.)]\s?/, "");

/** Renders a bullet or number in place of a hidden list marker. */
class ListMarkerWidget extends WidgetType {
  private label: string;
  private ordered: boolean;

  constructor(label: string, ordered: boolean) {
    super();
    this.label = label;
    this.ordered = ordered;
  }

  toDOM() {
    const el = document.createElement("span");
    el.className = `inkwell-list-marker ${
      this.ordered ? "inkwell-list-marker--ordered" : "inkwell-list-marker--bullet"
    }`;
    el.textContent = this.label;
    return el;
  }

  eq(other: WidgetType) {
    return other instanceof ListMarkerWidget && other.label === this.label;
  }
}

/** Counts the list item's position within its list, starting at 1. */
const listItemNumber = (node: SyntaxNode): number => {
  let count = 1;
  for (let sibling = node.prevSibling; sibling; sibling = sibling.prevSibling) {
    count += 1;
  }
  return count;
};

const resolveFromTo = (state: EditorState, pos?: PosOrRange): { from: number; to: number } => {
  const from = typeof pos === "number" ? pos : (pos?.from ?? state.selection.main.from);
  const to = typeof pos === "number" ? pos : (pos?.to ?? state.selection.main.to);
  return { from, to };
};

export const ListExtension: InkwellExtension = {
  name: "list",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "ListItem",
        hideSyntax: true,
        markup: (node, state) => markRangesWithWhitespace(node, state, "ListMark"),
        widgets: [
          {
            kind: "replace",
            type: (node) => {
              const ordered = node.parent?.name === "OrderedList";
              const label = ordered ? `${listItemNumber(node)}.` : "•";
              return new ListMarkerWidget(label, ordered);
            },
          },
        ],
      },
    ];
  },

  addCommands() {
    return {
      toggleBulletList: (ctx) => (options) => {
        const { from } = resolveFromTo(ctx.state, options?.pos);
        const line = ctx.state.doc.lineAt(from);

        const content = bulletMarker.test(line.text)
          ? stripBulletMarker(line.text)
          : `- ${stripOrderedMarker(line.text)}`;

        return insertContent(ctx)({ content, from: line.from, to: line.to });
      },

      toggleOrderedList: (ctx) => (options) => {
        const { from } = resolveFromTo(ctx.state, options?.pos);
        const line = ctx.state.doc.lineAt(from);

        const content = orderedMarker.test(line.text)
          ? stripOrderedMarker(line.text)
          : `1. ${stripBulletMarker(line.text)}`;

        return insertContent(ctx)({ content, from: line.from, to: line.to });
      },
    };
  },
};
