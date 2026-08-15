import { syntaxTree } from "@codemirror/language";
import type { Extension, Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { MarkdownDecorationConfig } from "./types/extensions.ts";

/** Creates decorations from syntax-tree node names declared by extensions. */
export function createMarkdownDecorations(configs: readonly MarkdownDecorationConfig[]): Extension {
  const decorationsByNodeName = new Map<string, Decoration[]>();

  for (const config of configs) {
    const decorations = decorationsByNodeName.get(config.nodeName) ?? [];
    decorations.push(Decoration.mark({ class: config.className }));
    decorationsByNodeName.set(config.nodeName, decorations);
  }

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      private buildDecorations(view: EditorView): DecorationSet {
        const ranges: Range<Decoration>[] = [];

        for (const { from, to } of view.visibleRanges) {
          syntaxTree(view.state).iterate({
            from,
            to,
            enter: (node) => {
              const decorations = decorationsByNodeName.get(node.name);
              if (!decorations) return;

              for (const decoration of decorations) {
                ranges.push(decoration.range(node.from, node.to));
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
