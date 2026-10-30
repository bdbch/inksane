import type { ChangeSpec, EditorState, Line } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import type { CommandContext } from "../types/commands.ts";
import { escapeHtml } from "../helpers/escapeHtml.ts";
import { htmlWidget } from "../helpers/htmlWidget.ts";
import { selectedLineNumbers } from "../helpers/indent.ts";
import {
  countIndentColumns,
  liftListItems,
  listItemAtLine,
  listItemLineRange,
  listItemQuoteDepth,
  listItemStartingAtLine,
  shiftIndentColumns,
  shiftTextIndent,
  sinkListItems,
} from "../helpers/listIndent.ts";
import { markRangesWithWhitespace } from "../helpers/markup.ts";
import { resolveFromTo } from "../helpers/resolveFromTo.ts";
import type { Extension, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    list: {
      /**
       * Toggles a bullet list for the lines in the given position or range, otherwise the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      toggleBulletList: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Toggles an ordered list for the lines in the given position or range, otherwise the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      toggleOrderedList: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Converts the selected list items between bullet and ordered lists.
       * The first selected item decides which type the rest are converted to.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      toggleListType: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Indents the selected list items one nesting level.
       * @param options An object containing the position or range.
       * @returns False when no selected item can move deeper.
       */
      sinkListItem: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Outdents the selected list items one nesting level.
       * @param options An object containing the position or range.
       * @returns False when no selected item can move shallower.
       */
      liftListItem: (options?: { pos?: PosOrRange }) => ReturnType;
    };
  }
}

type ParsedListLine = {
  indent: string;
  marker: string;
  spacing: string;
  body: string;
  task: { marker: string; body: string } | null;
};

type LineTarget = {
  line: Line;
  parsed: ParsedListLine | null;
  marker: string | null;
  body: string;
  keep: boolean;
};

const listLinePattern = /^([ \t]*)([-*+]|\d+[.)])(?:([ \t]+)(.*))?$/;
const taskPattern = /^(\[[ xX]\])(?:[ \t]+(.*))?$/;
const leadingIndentPattern = /^[ \t]*/;

const parseListLine = (text: string): ParsedListLine | null => {
  const match = listLinePattern.exec(text);
  if (!match) return null;

  const [, indent = "", marker = "", spacing = "", body = ""] = match;
  const taskMatch = taskPattern.exec(body);

  return {
    indent,
    marker,
    spacing,
    body,
    task: taskMatch ? { marker: taskMatch[1] ?? "", body: taskMatch[2] ?? "" } : null,
  };
};

const isBulletMarker = (marker: string): boolean => /^[-*+]$/.test(marker);
const isOrderedMarker = (marker: string): boolean => /^\d+[.)]$/.test(marker);

const isPlainListLine = (line: ParsedListLine, ordered: boolean): boolean =>
  !line.task && (ordered ? isOrderedMarker(line.marker) : isBulletMarker(line.marker));

const bodyWithoutTask = (line: ParsedListLine): string => (line.task ? line.task.body : line.body);

const leadingIndent = (text: string): string => leadingIndentPattern.exec(text)?.[0] ?? "";

/** The content column for a marker and its spacing, following Markdown's spacing rule. */
const contentColumn = (
  indent: string,
  marker: string,
  spacing: string,
  tabSize: number,
): number => {
  const indentColumns = countIndentColumns(indent, tabSize);
  const markerColumns = countIndentColumns(marker, tabSize);
  const startColumns = indentColumns + markerColumns;
  const spacingColumns =
    countIndentColumns(" ".repeat(startColumns) + spacing, tabSize) - startColumns;
  const effectiveSpacing = spacingColumns > 4 ? 1 : Math.max(spacingColumns, 1);
  return startColumns + effectiveSpacing;
};

/** Content column when a list marker is replaced but the spacing after it stays. */
const contentColumnForMarker = (
  state: EditorState,
  line: Line,
  mark: SyntaxNode,
  marker: string,
): number => {
  const text = state.doc.sliceString(line.from, line.to);

  let spacingEnd = mark.to;
  while (spacingEnd < line.to && /[ \t]/.test(state.doc.sliceString(spacingEnd, spacingEnd + 1))) {
    spacingEnd += 1;
  }

  const prefix = text.slice(0, mark.from - line.from);
  const spacing = state.doc.sliceString(mark.to, spacingEnd);
  return contentColumn(prefix, marker, spacing, state.tabSize);
};

const renderListLine = (indent: string, marker: string, spacing: string, body: string): string =>
  `${indent}${marker}${spacing}${body}`;

const renderKeptLine = (line: Line, delta: number, tabSize: number): string => {
  if (delta === 0) return line.text;
  const indent = leadingIndent(line.text);
  return shiftIndentColumns(indent, delta, tabSize) + line.text.slice(indent.length);
};

const renderTargetLine = (target: LineTarget, delta: number, tabSize: number): string => {
  if (target.keep) return renderKeptLine(target.line, delta, tabSize);

  const indent = shiftIndentColumns(
    target.parsed?.indent ?? leadingIndent(target.line.text),
    delta,
    tabSize,
  );
  if (target.marker === null) return indent + target.body;
  return renderListLine(indent, target.marker, target.parsed?.spacing ?? " ", target.body);
};

const getSelectedLines = (state: EditorState, from: number, to: number) => {
  const includeBlank = from === to;
  const lines: { line: Line; parsed: ParsedListLine | null }[] = [];

  for (const number of selectedLineNumbers(state, from, to)) {
    const line = state.doc.line(number);
    if (!includeBlank && line.text.trim() === "") continue;
    lines.push({ line, parsed: parseListLine(line.text) });
  }

  return lines;
};

/** Applies line text edits and shifts nested indentation when markers get wider or narrower. */
const applyLineTargets = (state: EditorState, targets: LineTarget[]): Map<number, string> => {
  const indentDeltas = new Map<number, number>();

  for (const target of targets) {
    if (!target.parsed || target.marker === null || target.keep) continue;

    const oldColumn = contentColumn(
      target.parsed.indent,
      target.parsed.marker,
      target.parsed.spacing,
      state.tabSize,
    );
    const newColumn = contentColumn(
      target.parsed.indent,
      target.marker,
      target.parsed.spacing,
      state.tabSize,
    );
    const delta = newColumn - oldColumn;
    if (delta === 0) continue;

    const item = listItemAtLine(state, target.line.number);
    if (!item) continue;

    const range = listItemLineRange(state, item);
    for (let number = range.from + 1; number <= range.to; number++) {
      if (state.doc.line(number).text.trim() === "") continue;
      indentDeltas.set(number, (indentDeltas.get(number) ?? 0) + delta);
    }
  }

  const targetsByLine = new Map(targets.map((target) => [target.line.number, target]));
  const numbers = new Set<number>(targetsByLine.keys());
  for (const number of indentDeltas.keys()) numbers.add(number);

  const texts = new Map<number, string>();
  for (const number of [...numbers].sort((a, b) => a - b)) {
    const line = state.doc.line(number);
    const target = targetsByLine.get(number);
    const delta = indentDeltas.get(number) ?? 0;
    texts.set(
      number,
      target
        ? renderTargetLine(target, delta, state.tabSize)
        : renderKeptLine(line, delta, state.tabSize),
    );
  }

  return texts;
};

/** Replaces only the part of a line that changed, so the selection keeps its text. */
const lineChange = (
  line: Line,
  text: string,
): { from: number; to: number; insert: string } | null => {
  if (text === line.text) return null;

  let start = 0;
  const maxStart = Math.min(line.text.length, text.length);
  while (start < maxStart && line.text[start] === text[start]) start += 1;

  let end = 0;
  while (
    end < line.text.length - start &&
    end < text.length - start &&
    line.text[line.text.length - 1 - end] === text[text.length - 1 - end]
  ) {
    end += 1;
  }

  return {
    from: line.from + start,
    to: line.from + line.text.length - end,
    insert: text.slice(start, text.length - end),
  };
};

const dispatchLineTexts = (ctx: CommandContext, texts: Map<number, string>): boolean => {
  const changes: ChangeSpec[] = [];

  for (const [number, text] of texts) {
    const line = ctx.state.doc.line(number);
    const change = lineChange(line, text);
    if (change) changes.push(change);
  }

  if (changes.length === 0) return false;
  ctx.dispatch({ changes });
  return true;
};

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
        markup: (node, state) =>
          node.getChild("Task") ? [] : markRangesWithWhitespace(node, state, "ListMark"),
        widgets: [
          {
            kind: "replace",
            type: (node, state) => {
              if (node.getChild("Task")) return null;
              const ordered = node.parent?.name === "OrderedList";
              const label = ordered ? `${orderedItemNumber(node, state)}.` : "•";
              return htmlWidget(escapeHtml(label), { className: listMarkerClass(ordered) });
            },
          },
        ],
      },
    ];
  },

  addStateQueries() {
    return [
      { name: "bulletList", kind: "node", nodeNames: ["BulletList"] },
      { name: "orderedList", kind: "node", nodeNames: ["OrderedList"] },
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
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const lines = getSelectedLines(ctx.state, from, to);
        if (lines.length === 0) return false;

        const removeMarkers = lines.every(
          ({ parsed }) => parsed !== null && isPlainListLine(parsed, false),
        );

        const targets: LineTarget[] = lines.map(({ line, parsed }) => {
          if (removeMarkers) {
            return { line, parsed, marker: null, body: parsed?.body ?? line.text, keep: false };
          }
          if (parsed && isPlainListLine(parsed, false)) {
            return { line, parsed, marker: parsed.marker, body: parsed.body, keep: true };
          }
          return {
            line,
            parsed,
            marker: "-",
            body: parsed
              ? bodyWithoutTask(parsed)
              : line.text.slice(leadingIndent(line.text).length),
            keep: false,
          };
        });

        return dispatchLineTexts(ctx, applyLineTargets(ctx.state, targets));
      },

      toggleOrderedList: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const lines = getSelectedLines(ctx.state, from, to);
        if (lines.length === 0) return false;

        const removeMarkers = lines.every(
          ({ parsed }) => parsed !== null && isPlainListLine(parsed, true),
        );

        let number = 1;
        const targets: LineTarget[] = lines.map(({ line, parsed }) => {
          if (removeMarkers) {
            return { line, parsed, marker: null, body: parsed?.body ?? line.text, keep: false };
          }
          return {
            line,
            parsed,
            marker: `${number++}.`,
            body: parsed
              ? bodyWithoutTask(parsed)
              : line.text.slice(leadingIndent(line.text).length),
            keep: false,
          };
        });

        return dispatchLineTexts(ctx, applyLineTargets(ctx.state, targets));
      },

      toggleListType: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selected: { item: SyntaxNode; mark: SyntaxNode }[] = [];

        for (const number of selectedLineNumbers(ctx.state, from, to)) {
          const line = ctx.state.doc.line(number);
          if (line.text.trim() === "") continue;

          const item = listItemStartingAtLine(ctx.state, number);
          const mark = item?.getChild("ListMark");
          if (item && mark) selected.push({ item, mark });
        }

        if (selected.length === 0) return false;

        const firstMarker = ctx.state.doc.sliceString(
          selected[0]?.mark.from ?? 0,
          selected[0]?.mark.to ?? 0,
        );
        const toOrdered = isBulletMarker(firstMarker);
        const changes: { from: number; to: number; insert: string }[] = [];
        const indentDeltas = new Map<number, Map<number, number>>();
        let number = 1;

        for (const { item, mark } of selected) {
          const line = ctx.state.doc.lineAt(mark.from);
          const oldMarker = ctx.state.doc.sliceString(mark.from, mark.to);
          const newMarker = toOrdered
            ? `${number++}.`
            : isBulletMarker(oldMarker)
              ? oldMarker
              : "-";
          if (newMarker === oldMarker) continue;

          changes.push({ from: mark.from, to: mark.to, insert: newMarker });

          const oldColumn = contentColumnForMarker(ctx.state, line, mark, oldMarker);
          const newColumn = contentColumnForMarker(ctx.state, line, mark, newMarker);
          const delta = newColumn - oldColumn;
          if (delta === 0) continue;

          const depth = listItemQuoteDepth(item);
          const range = listItemLineRange(ctx.state, item);
          for (let lineNumber = range.from + 1; lineNumber <= range.to; lineNumber++) {
            const byDepth = indentDeltas.get(lineNumber) ?? new Map<number, number>();
            byDepth.set(depth, (byDepth.get(depth) ?? 0) + delta);
            indentDeltas.set(lineNumber, byDepth);
          }
        }

        for (const [lineNumber, byDepth] of indentDeltas) {
          const line = ctx.state.doc.line(lineNumber);
          let text = line.text;

          for (const depth of [...byDepth.keys()].sort((a, b) => a - b)) {
            text = shiftTextIndent(text, byDepth.get(depth) ?? 0, depth, ctx.state.tabSize);
          }

          const change = lineChange(line, text);
          if (change) changes.push(change);
        }

        if (changes.length === 0) return false;
        changes.sort((a, b) => a.from - b.from);
        ctx.dispatch({ changes });
        return true;
      },

      sinkListItem: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const transaction = sinkListItems(ctx.state, from, to);
        if (!transaction) return false;
        ctx.dispatch(transaction);
        return true;
      },

      liftListItem: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const transaction = liftListItems(ctx.state, from, to);
        if (!transaction) return false;
        ctx.dispatch(transaction);
        return true;
      },
    };
  },
};
