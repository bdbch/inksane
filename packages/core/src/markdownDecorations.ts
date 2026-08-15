import { syntaxTree } from "@codemirror/language";
import type { Extension, Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import type { MarkdownDecorationConfig, MarkupRange } from "./types/extensions.ts";

/**
 * Resolves which parts of a syntax node count as markdown markup.
 * Defaults to the node's direct `*Mark` children.
 */
function resolveMarkupRanges(config: MarkdownDecorationConfig, node: SyntaxNode): MarkupRange[] {
  if (typeof config.markup === "function") {
    return config.markup(node);
  }

  const names = config.markup;
  const ranges: MarkupRange[] = [];

  for (let child = node.firstChild; child; child = child.nextSibling) {
    const matches = names ? names.includes(child.name) : child.name.endsWith("Mark");
    if (matches) ranges.push({ from: child.from, to: child.to });
  }

  return ranges;
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

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || (hasHideSyntax && update.selectionSet)) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      private buildDecorations(view: EditorView): DecorationSet {
        const ranges: Range<Decoration>[] = [];
        const { from: selFrom, to: selTo } = view.state.selection.main;

        for (const { from, to } of view.visibleRanges) {
          syntaxTree(view.state).iterate({
            from,
            to,
            enter: (node) => {
              const entries = entriesByNodeName.get(node.name);
              if (!entries) return;

              for (const { config, mark } of entries) {
                ranges.push(mark.range(node.from, node.to));

                if (config.hideSyntax && (node.from > selTo || node.to < selFrom)) {
                  for (const { from: markupFrom, to: markupTo } of resolveMarkupRanges(
                    config,
                    node.node,
                  )) {
                    ranges.push(Decoration.replace({}).range(markupFrom, markupTo));
                  }
                }
              }
            },
          });
        }

        return Decoration.set(ranges, true);
      }
    },
    {
      decorations: (value) => value.decorations,
    },
  );
}
