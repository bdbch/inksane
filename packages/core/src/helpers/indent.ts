import { ChangeSet, EditorState, type ChangeSpec, type TransactionSpec } from "@codemirror/state";

/** The line numbers affected by a selection range (or the cursor's line). */
function selectedLines(state: EditorState, from: number, to: number): number[] {
  const startLine = state.doc.lineAt(from);
  const endLine = state.doc.lineAt(to);

  if (from === to) return [startLine.number];

  const first = startLine.number;
  const last = to === endLine.from ? endLine.number - 1 : endLine.number;

  const lines: number[] = [];
  for (let n = first; n <= last; n++) lines.push(n);
  return lines;
}

/** Change that sinks a line: inserts `unit` at its start. */
export function sinkLine(state: EditorState, lineNumber: number, unit: string): ChangeSpec {
  return { from: state.doc.line(lineNumber).from, insert: unit };
}

/** Change that lifts a line: removes up to `unit.length` leading whitespace, or null. */
export function liftLine(state: EditorState, lineNumber: number, unit: string): ChangeSpec | null {
  const line = state.doc.line(lineNumber);
  const indent = /^\s*/.exec(line.text)?.[0].length ?? 0;
  const remove = Math.min(unit.length, indent);
  return remove > 0 ? { from: line.from, to: line.from + remove } : null;
}

/**
 * Builds a transaction that indents (dir 1) or dedents (dir -1) the selected lines,
 * keeping the selection mapped onto the same lines.
 * Returns null when no changes would be made.
 */
export function indentLines(state: EditorState, dir: 1 | -1, unit: string): TransactionSpec | null {
  const lineNumbers = new Set<number>();
  for (const range of state.selection.ranges) {
    for (const number of selectedLines(state, range.from, range.to)) {
      lineNumbers.add(number);
    }
  }

  const changeSpecs: ChangeSpec[] = [];
  for (const number of [...lineNumbers].sort((a, b) => a - b)) {
    const change = dir > 0 ? sinkLine(state, number, unit) : liftLine(state, number, unit);
    if (change) changeSpecs.push(change);
  }

  if (changeSpecs.length === 0) return null;

  const changes = ChangeSet.of(
    changeSpecs,
    state.doc.length,
    state.facet(EditorState.lineSeparator),
  );
  return { changes, selection: state.selection.map(changes) };
}
