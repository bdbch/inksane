import { syntaxTree } from "@codemirror/language";
import { type EditorState, type Extension, type Range, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import type { MarkdownDecorationConfig, MarkupRange } from "./types/extensions.ts";

/**
 * Resolves which parts of a syntax node count as markdown markup.
 * Defaults to the node's direct `*Mark` children.
 */
function resolveMarkupRanges(
  config: MarkdownDecorationConfig,
  node: SyntaxNode,
  state: EditorState,
): MarkupRange[] {
  if (typeof config.markup === "function") {
    return config.markup(node, state);
  }

  const names = config.markup;
  const ranges: MarkupRange[] = [];

  for (let child = node.firstChild; child; child = child.nextSibling) {
    const matches = names ? names.includes(child.name) : child.name.endsWith("Mark");
    if (matches) ranges.push({ from: child.from, to: child.to });
  }

  return ranges;
}

function buildDecorations(
  state: EditorState,
  entriesByNodeName: Map<string, { config: MarkdownDecorationConfig; mark: Decoration }[]>,
  hasHideSyntax: boolean,
): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const { from: selFrom, to: selTo } = state.selection.main;

  syntaxTree(state).iterate({
    from: 0,
    to: state.doc.length,
    enter: (node) => {
      const entries = entriesByNodeName.get(node.name);
      if (!entries) return;

      for (const { config, mark } of entries) {
        ranges.push(mark.range(node.from, node.to));

        if (hasHideSyntax && config.hideSyntax && (node.from > selTo || node.to < selFrom)) {
          for (const { from: markupFrom, to: markupTo } of resolveMarkupRanges(
            config,
            node.node,
            state,
          )) {
            const hide = config.widget
              ? Decoration.replace({
                  widget: config.widget.type,
                  block: config.widget.block,
                })
              : Decoration.replace({});
            ranges.push(hide.range(markupFrom, markupTo));
          }
        }
      }
    },
  });

  return Decoration.set(ranges, true);
}

/** Creates decorations from syntax-tree node names declared by extensions. */
export function createMarkdownDecorations(configs: readonly MarkdownDecorationConfig[]): Extension {
  const entriesByNodeName = new Map<
    string,
    { config: MarkdownDecorationConfig; mark: Decoration }[]
  >();
  const hasHideSyntax = configs.some((config) => config.hideSyntax);

  for (const config of configs) {
    const mark = Decoration.mark({ class: config.className });
    const entries = entriesByNodeName.get(config.nodeName) ?? [];
    entries.push({ config, mark });
    entriesByNodeName.set(config.nodeName, entries);
  }

  return StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state, entriesByNodeName, hasHideSyntax),
    update: (value, transaction) => {
      if (transaction.docChanged || (hasHideSyntax && transaction.selection)) {
        return buildDecorations(transaction.state, entriesByNodeName, hasHideSyntax);
      }
      return value.map(transaction.changes);
    },
    provide: (field) => EditorView.decorations.from(field),
  });
}
