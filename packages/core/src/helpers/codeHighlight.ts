import type { EditorState, Extension, Range } from "@codemirror/state";
import type { HighlightStyle } from "@codemirror/language";
import { syntaxTree } from "@codemirror/language";
import { Decoration, EditorView, ViewPlugin } from "@codemirror/view";
import type { DecorationSet, ViewUpdate } from "@codemirror/view";
import { highlightTree } from "@lezer/highlight";

type VisibleRange = { from: number; to: number };

const isCodeBlock = (name: string) => name === "FencedCode" || name === "CodeBlock";

/**
 * Builds token decorations for code block content inside the given ranges.
 * Fence marks and Markdown syntax outside the blocks stay untouched.
 */
export function buildCodeHighlightDecorations(
  state: EditorState,
  ranges: readonly VisibleRange[],
  style: HighlightStyle,
): DecorationSet {
  const tree = syntaxTree(state);
  const decorations: Range<Decoration>[] = [];

  for (const { from, to } of ranges) {
    tree.iterate({
      from,
      to,
      enter: (node) => {
        if (!isCodeBlock(node.name)) return;

        for (let child = node.node.firstChild; child; child = child.nextSibling) {
          if (child.name !== "CodeText") continue;

          const start = Math.max(child.from, from);
          const end = Math.min(child.to, to);
          if (start >= end) continue;

          highlightTree(
            tree,
            style,
            (tokenFrom, tokenTo, className) => {
              decorations.push(Decoration.mark({ class: className }).range(tokenFrom, tokenTo));
            },
            start,
            end,
          );
        }

        return false;
      },
    });
  }

  return Decoration.set(decorations, true);
}

// CodeMirror keeps themeType on the instance but outside its public types.
type ThemedHighlightStyle = HighlightStyle & { themeType?: "dark" | "light" };

/** Whether a style applies to the current light or dark theme. */
export const styleApplies = (state: EditorState, style: HighlightStyle) => {
  const themeType = (style as ThemedHighlightStyle).themeType;
  return !themeType || state.facet(EditorView.darkTheme) === (themeType === "dark");
};

const buildForView = (view: EditorView, style: HighlightStyle) =>
  styleApplies(view.state, style)
    ? buildCodeHighlightDecorations(view.state, view.visibleRanges, style)
    : Decoration.none;

/**
 * Highlights fenced and indented code blocks without touching Markdown tokens.
 */
export function codeHighlightExtension(style: HighlightStyle): Extension {
  const styleModule = style.module ? EditorView.styleModule.of(style.module) : [];

  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildForView(view, style);
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.startState.facet(EditorView.darkTheme) !==
            update.state.facet(EditorView.darkTheme) ||
          syntaxTree(update.state) !== syntaxTree(update.startState)
        ) {
          this.decorations = buildForView(update.view, style);
        }
      }
    },
    {
      decorations: (value) => value.decorations,
    },
  );

  return [styleModule, plugin];
}
