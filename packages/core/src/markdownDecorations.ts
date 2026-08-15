import { syntaxTree } from "@codemirror/language";
import { type EditorState, type Extension, type Range, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, type WidgetType } from "@codemirror/view";
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

/** Resolves a widget type from a value or a per-node factory. */
function resolveWidgetType(
  type: WidgetType | ((node: SyntaxNode, state: EditorState) => WidgetType),
  node: SyntaxNode,
  state: EditorState,
): WidgetType {
  return typeof type === "function" ? type(node, state) : type;
}

function buildDecorations(
  state: EditorState,
  entriesByNodeName: Map<string, { config: MarkdownDecorationConfig; mark: Decoration }[]>,
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

        const hidden = config.hideSyntax && (node.from > selTo || node.to < selFrom);
        const markupRanges = resolveMarkupRanges(config, node.node, state);

        if (config.widgets) {
          for (const widget of config.widgets) {
            if (widget.kind === "replace") {
              if (!hidden) continue;

              const type = resolveWidgetType(widget.type, node.node, state);
              for (const { from, to } of markupRanges) {
                ranges.push(
                  Decoration.replace({ widget: type, block: widget.block }).range(from, to),
                );
              }
            } else if (widget.onlyWhenHidden !== false || hidden) {
              const pos =
                typeof widget.position === "function"
                  ? widget.position(node.node, state)
                  : widget.position === "before"
                    ? node.from
                    : node.to;
              const side = widget.position === "before" ? -1 : 1;
              ranges.push(
                Decoration.widget({
                  widget: resolveWidgetType(widget.type, node.node, state),
                  side,
                }).range(pos),
              );
            }
          }
        }

        if (hidden && !config.widgets?.some((w) => w.kind === "replace")) {
          for (const { from, to } of markupRanges) {
            ranges.push(Decoration.replace({}).range(from, to));
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
  const hasSelectionDependent = configs.some(
    (config) => config.hideSyntax || (config.widgets?.length ?? 0) > 0,
  );

  for (const config of configs) {
    const mark = Decoration.mark({ class: config.className });
    const entries = entriesByNodeName.get(config.nodeName) ?? [];
    entries.push({ config, mark });
    entriesByNodeName.set(config.nodeName, entries);
  }

  return StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state, entriesByNodeName),
    update: (value, transaction) => {
      if (transaction.docChanged || (hasSelectionDependent && transaction.selection)) {
        return buildDecorations(transaction.state, entriesByNodeName);
      }
      return value.map(transaction.changes);
    },
    provide: (field) => EditorView.decorations.from(field),
  });
}
