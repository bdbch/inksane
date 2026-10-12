import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import { insertContent } from "../commands/index.ts";
import { escapeHtml } from "../helpers/escapeHtml.ts";
import { htmlWidget } from "../helpers/htmlWidget.ts";
import { markRangesWithWhitespace } from "../helpers/markup.ts";
import { resolveFromTo } from "../helpers/resolveFromTo.ts";
import type { Extension, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
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

const listMarkerClass = (ordered: boolean) =>
  `inksane-list-marker ${ordered ? "inksane-list-marker--ordered" : "inksane-list-marker--bullet"}`;

const isListTag = (tag: string) => tag === "ul" || tag === "ol";

/** Prefixes the first line with a list marker and indents continuation lines. */
const indentListItem = (content: string, marker: string): string => {
  const [first = "", ...rest] = content.split("\n");
  const pad = " ".repeat(marker.length);
  return [marker + first, ...rest.map((line) => (line.length ? pad + line : ""))].join("\n");
};

/** Returns true when two sibling nodes are separated by a blank line. */
const isBlankLineSeparated = (a: SyntaxNode, b: SyntaxNode, state: EditorState): boolean => {
  return /\n[^\S\n]*\n/.test(state.doc.sliceString(a.to, b.from));
};

/**
 * Computes the effective number of an ordered list item.
 * Starts from the first item's ListMark, continues by offset within a block,
 * and restarts at the item's own marker after a blank-line separated block.
 */
const orderedItemNumber = (node: SyntaxNode, state: EditorState): number => {
  let number = 1;
  let prev: SyntaxNode | null = null;
  let index = 0;
  const nodeFrom = node.from;
  const nodeTo = node.to;

  for (let sibling = node.parent?.firstChild; sibling; sibling = sibling.nextSibling) {
    const mark = sibling.getChild("ListMark");
    const raw = mark ? /^(\d+)/.exec(state.doc.sliceString(mark.from, mark.to))?.[1] : undefined;
    const marker = raw ? Number(raw) : number + 1;

    if (index === 0) {
      number = marker;
    } else if (prev && isBlankLineSeparated(prev, sibling, state)) {
      number = marker;
    } else {
      number += 1;
    }

    if (sibling.from === nodeFrom && sibling.to === nodeTo) return number;

    prev = sibling;
    index += 1;
  }

  return number;
};

export const ListExtension: Extension = {
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
            type: (node, state) => {
              const ordered = node.parent?.name === "OrderedList";
              const label = ordered ? `${orderedItemNumber(node, state)}.` : "•";
              return htmlWidget(escapeHtml(label), { className: listMarkerClass(ordered) });
            },
          },
        ],
      },
    ];
  },

  addHtmlConverters() {
    return [
      {
        block: true,
        match: (element) => isListTag(element.tagName.toLowerCase()),
        toMarkdown: (element, { renderChildren }) => {
          const ordered = element.tagName.toLowerCase() === "ol";
          const start = Number.parseInt(element.getAttribute("start") ?? "1", 10);
          let index = Number.isNaN(start) ? 1 : start;
          const items: string[] = [];

          for (const child of Array.from(element.children)) {
            if (child.tagName.toLowerCase() !== "li") continue;
            const marker = ordered ? `${index++}. ` : "- ";
            items.push(indentListItem(renderChildren(child).trim(), marker));
          }

          return items.join("\n");
        },
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
