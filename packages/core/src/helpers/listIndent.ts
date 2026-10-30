import { syntaxTree } from "@codemirror/language";
import {
  ChangeSet,
  EditorState,
  type ChangeSpec,
  type Line,
  type TransactionSpec,
} from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import { selectedLineNumbers } from "./indent.ts";

const whitespacePattern = /^[ \t]*/;
const hasContent = (text: string): boolean => text.trim().length > 0;

type LineIndent = {
  prefix: string;
  whitespace: string;
  columns: number;
};

/** Counts indentation columns, expanding tabs to the next tab stop. */
export function countIndentColumns(text: string, tabSize: number): number {
  let columns = 0;

  for (const char of text) {
    columns += char === "\t" ? tabSize - (columns % tabSize) : 1;
  }

  return columns;
}

/** Shifts leading indentation by a number of columns, writing the result as spaces. */
export function shiftIndentColumns(indent: string, delta: number, tabSize: number): string {
  if (delta === 0) return indent;
  return " ".repeat(Math.max(0, countIndentColumns(indent, tabSize) + delta));
}

/** Reads the quote markers that sit outside a list item. */
function quotePrefix(text: string, depth: number): string {
  let index = 0;

  for (let level = 0; level < depth; level += 1) {
    while (index < text.length && (text[index] === " " || text[index] === "\t")) index += 1;
    if (text[index] !== ">") break;
    index += 1;
    if (text[index] === " " || text[index] === "\t") index += 1;
  }

  return text.slice(0, index);
}

function lineIndent(state: EditorState, line: Line, quoteDepth: number): LineIndent {
  const prefix = quotePrefix(line.text, quoteDepth);
  const whitespace = whitespacePattern.exec(line.text.slice(prefix.length))?.[0] ?? "";

  return {
    prefix,
    whitespace,
    columns: countIndentColumns(prefix + whitespace, state.tabSize),
  };
}

/** Builds a change that keeps outer quote markers and replaces the list indentation. */
function indentChange(
  state: EditorState,
  line: Line,
  targetColumns: number,
  quoteDepth: number,
): { from: number; to: number; insert: string } | null {
  const indent = lineIndent(state, line, quoteDepth);
  if (indent.columns === targetColumns) return null;

  const prefixColumns = countIndentColumns(indent.prefix, state.tabSize);
  const spaces = Math.max(0, targetColumns - prefixColumns);
  const insert = indent.prefix + " ".repeat(spaces);
  const to = line.from + indent.prefix.length + indent.whitespace.length;

  if (insert === line.text.slice(0, to - line.from)) return null;
  return { from: line.from, to, insert };
}

/** The number of blockquotes that contain a list item, not quotes inside it. */
export function listItemQuoteDepth(item: SyntaxNode): number {
  let depth = 0;

  for (let node = item.parent; node; node = node.parent) {
    if (node.name === "Blockquote") depth += 1;
  }

  return depth;
}

/** Shifts text indentation by columns, keeping the outer quote markers. */
export function shiftTextIndent(
  text: string,
  delta: number,
  depth: number,
  tabSize: number,
): string {
  if (delta === 0) return text;

  const prefix = quotePrefix(text, depth);
  const rest = text.slice(prefix.length);
  const whitespace = whitespacePattern.exec(rest)?.[0] ?? "";
  const prefixColumns = countIndentColumns(prefix, tabSize);
  const columns = countIndentColumns(prefix + whitespace, tabSize);
  const spaces = Math.max(0, columns + delta - prefixColumns);

  return prefix + " ".repeat(spaces) + rest.slice(whitespace.length);
}

type LineItemNodes = {
  marked: SyntaxNode | null;
  covering: SyntaxNode | null;
};

function lineItemNodes(state: EditorState, lineNumber: number): LineItemNodes {
  const line = state.doc.line(lineNumber);
  let marked: SyntaxNode | null = null;
  let covering: SyntaxNode | null = null;

  syntaxTree(state).iterate({
    from: line.from,
    to: line.to,
    enter(ref) {
      if (ref.name !== "ListItem") return;
      if (ref.from >= line.from && ref.from <= line.to) marked = ref.node;
      if (ref.from <= line.from && line.to <= ref.to) covering = ref.node;
    },
  });

  return { marked, covering };
}

/** The innermost list item that starts on the line, or covers it for continuation lines. */
export function listItemAtLine(state: EditorState, lineNumber: number): SyntaxNode | null {
  const { marked, covering } = lineItemNodes(state, lineNumber);
  return marked ?? covering;
}

/** The list item whose marker starts on the line, or null when the line is not an item start. */
export function listItemStartingAtLine(state: EditorState, lineNumber: number): SyntaxNode | null {
  return lineItemNodes(state, lineNumber).marked;
}

function previousListItem(item: SyntaxNode): SyntaxNode | null {
  for (let sibling = item.prevSibling; sibling; sibling = sibling.prevSibling) {
    if (sibling.name === "ListItem") return sibling;
  }
  return null;
}

/** The first and last line occupied by a list item, including nested content. */
export function listItemLineRange(
  state: EditorState,
  item: SyntaxNode,
): { from: number; to: number } {
  const from = state.doc.lineAt(item.from).number;
  const lastPos = item.to > item.from ? item.to - 1 : item.to;
  const to = state.doc.lineAt(lastPos).number;
  return { from, to };
}

/** The column where a list item's content starts. */
function contentColumn(item: SyntaxNode, state: EditorState): number {
  const mark = item.getChild("ListMark");
  if (!mark) return 0;

  const line = state.doc.lineAt(mark.from);
  let end = mark.to;
  while (end < line.to && /[ \t]/.test(state.doc.sliceString(end, end + 1))) end += 1;

  const markColumns = countIndentColumns(state.doc.sliceString(line.from, mark.to), state.tabSize);
  const contentColumns = countIndentColumns(state.doc.sliceString(line.from, end), state.tabSize);
  const spacingColumns = contentColumns - markColumns;

  // Markdown treats more than four spaces after a marker as one space.
  const effectiveSpacing = spacingColumns > 4 ? 1 : Math.max(spacingColumns, 1);
  return markColumns + effectiveSpacing;
}

function nearestParentItem(item: SyntaxNode): SyntaxNode | null {
  for (let node = item.parent; node; node = node.parent) {
    if (node.name === "ListItem") return node;
  }
  return null;
}

/** Selected list items, keeping only the outermost item of nested selections. */
function selectedItems(state: EditorState, from: number, to: number): SyntaxNode[] {
  const seen = new Set<string>();
  const items: SyntaxNode[] = [];

  for (const number of selectedLineNumbers(state, from, to)) {
    const line = state.doc.line(number);
    if (!hasContent(line.text)) continue;

    const item = listItemAtLine(state, number);
    if (!item) continue;

    const key = `${item.from}:${item.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  items.sort((a, b) => a.from - b.from);

  return items.filter(
    (item, index) =>
      !items.slice(0, index).some((outer) => outer.from <= item.from && item.to <= outer.to),
  );
}

/** Whether every non-blank line in the range is inside a list item. */
export function selectionIsInList(state: EditorState, from: number, to: number): boolean {
  let found = false;

  for (const number of selectedLineNumbers(state, from, to)) {
    const line = state.doc.line(number);
    if (!hasContent(line.text)) continue;
    if (!listItemAtLine(state, number)) return false;
    found = true;
  }

  return found;
}

function transactionFor(state: EditorState, changes: ChangeSpec[]): TransactionSpec | null {
  if (changes.length === 0) return null;

  const changeSet = ChangeSet.of(changes, state.doc.length, state.facet(EditorState.lineSeparator));
  return { changes: changeSet, selection: state.selection.map(changeSet) };
}

/** Indents the selected list items one nesting level, based on the previous sibling. */
export function sinkListItems(
  state: EditorState,
  from: number,
  to: number,
): TransactionSpec | null {
  const changes: ChangeSpec[] = [];

  for (const item of selectedItems(state, from, to)) {
    const previous = previousListItem(item);
    if (!previous) continue;

    const depth = listItemQuoteDepth(item);
    const itemLine = state.doc.lineAt(item.from);
    const delta = contentColumn(previous, state) - lineIndent(state, itemLine, depth).columns;
    if (delta <= 0) continue;

    const range = listItemLineRange(state, item);
    for (let number = range.from; number <= range.to; number++) {
      const line = state.doc.line(number);
      if (!hasContent(line.text)) continue;

      const targetColumns = lineIndent(state, line, depth).columns + delta;
      const change = indentChange(state, line, targetColumns, depth);
      if (change) changes.push(change);
    }
  }

  return transactionFor(state, changes);
}

/** Outdents the selected list items one nesting level. */
export function liftListItems(
  state: EditorState,
  from: number,
  to: number,
): TransactionSpec | null {
  const changes: ChangeSpec[] = [];

  for (const item of selectedItems(state, from, to)) {
    const parent = nearestParentItem(item);
    if (!parent) continue;

    const depth = listItemQuoteDepth(item);
    const itemLine = state.doc.lineAt(item.from);
    const parentLine = state.doc.lineAt(parent.from);
    const delta =
      lineIndent(state, itemLine, depth).columns - lineIndent(state, parentLine, depth).columns;
    if (delta <= 0) continue;

    const range = listItemLineRange(state, item);
    for (let number = range.from; number <= range.to; number++) {
      const line = state.doc.line(number);
      if (!hasContent(line.text)) continue;

      const targetColumns = Math.max(0, lineIndent(state, line, depth).columns - delta);
      const change = indentChange(state, line, targetColumns, depth);
      if (change) changes.push(change);
    }
  }

  return transactionFor(state, changes);
}
