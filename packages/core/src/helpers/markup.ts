import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import type { MarkupRange } from "../types/index.ts";

/**
 * Creates markup ranges for the node's children with the given name,
 * extended to include the whitespace between the marker and the content.
 * e.g. `# `, `> `, `- `. With `recursive`, child nodes are searched too.
 */
export function markRangesWithWhitespace(
  node: SyntaxNode,
  state: EditorState,
  name: string,
  recursive = false,
): MarkupRange[] {
  const ranges: MarkupRange[] = [];

  const walk = (parent: SyntaxNode) => {
    for (let child = parent.firstChild; child; child = child.nextSibling) {
      if (child.name === name) {
        let to = child.to;
        while (to < node.to && /[ \t]/.test(state.doc.sliceString(to, to + 1))) to += 1;
        ranges.push({ from: child.from, to });
      } else if (recursive) {
        walk(child);
      }
    }
  };

  walk(node);
  return ranges;
}
