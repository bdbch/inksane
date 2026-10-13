import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import type { Range } from "../types/index.ts";
import type { StateQueryConfig } from "../types/extensions.ts";

/** Walks the syntax tree and visits every node matching one of the configs. */
function forEachMatch(
  state: EditorState,
  configs: readonly StateQueryConfig[],
  visit: (config: StateQueryConfig, node: SyntaxNode) => boolean | void,
): void {
  syntaxTree(state).iterate({
    from: 0,
    to: state.doc.length,
    enter: (ref) => {
      for (const config of configs) {
        if (config.nodeNames.includes(ref.name) && visit(config, ref.node) === false) {
          return false;
        }
      }
    },
  });
}

/** Whether a selection range counts as sitting on a matched node. */
function isActiveAt(config: StateQueryConfig, node: SyntaxNode, from: number, to: number): boolean {
  if (config.kind === "node") {
    return node.from <= from && to <= node.to;
  }

  // A collapsed selection only counts inside a mark, not on its edge, so a
  // caret just after `**bold**` is not bold.
  if (from === to) {
    return node.from < from && from < node.to;
  }

  return node.from <= from && to <= node.to;
}

/** True when the node's resolved attributes include every requested attribute. */
function attrsMatch(
  config: StateQueryConfig,
  node: SyntaxNode,
  state: EditorState,
  requested?: Record<string, unknown>,
): boolean {
  if (!requested) return true;

  const resolved = config.attrs?.(node, state) ?? {};
  return Object.entries(requested).every(([key, value]) => resolved[key] === value);
}

/** Whether the named query is active at the current selection. */
export function isQueryActive(
  state: EditorState,
  configs: readonly StateQueryConfig[],
  name: string,
  attrs?: Record<string, unknown>,
): boolean {
  const { from, to } = state.selection.main;
  let active = false;

  forEachMatch(state, configs, (config, node) => {
    if (config.name !== name) return;
    if (!isActiveAt(config, node, from, to)) return;
    if (!attrsMatch(config, node, state, attrs)) return;

    active = true;
    return false;
  });

  return active;
}

/**
 * The range of the mark around a position, or the innermost mark when no name
 * is given. Returns null when no matching mark contains the position.
 */
export function getActiveMarkRange(
  state: EditorState,
  configs: readonly StateQueryConfig[],
  name?: string,
  pos: number = state.selection.main.from,
): Range | null {
  const candidates = configs.filter((config) =>
    name === undefined ? config.kind !== "node" : config.name === name,
  );
  let range: Range | null = null;

  forEachMatch(state, candidates, (_config, node) => {
    if (pos < node.from || pos > node.to) return;

    if (!range || node.to - node.from < range.to - range.from) {
      range = { from: node.from, to: node.to };
    }
  });

  return range;
}
