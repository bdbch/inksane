import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import type { Extension as CMExtension } from "@codemirror/state";
import type { Extension } from "../types/index.ts";

/** Class applied to the empty line so themes can style the placeholder. */
export const PLACEHOLDER_CLASS = "inksane-placeholder";

/** Attribute that carries the placeholder text for the generated element. */
const PLACEHOLDER_ATTRIBUTE = "data-inksane-placeholder";

/**
 * Renders the placeholder as generated content on the line.
 *
 * CodeMirror's own `placeholder` renders a zero-width widget, so it has to
 * insert a `cm-widgetBuffer` image that reserves space for the caret. That
 * image can grow the line box and leave the caret hanging above the text, so
 * the placeholder is drawn as generated content instead. The element is kept
 * out of the inline flow so the caret stays at the line start, next to it.
 */
const placeholderTheme = EditorView.baseTheme({
  [`.${PLACEHOLDER_CLASS}`]: {
    position: "relative",
  },
  [`.${PLACEHOLDER_CLASS}::before`]: {
    content: `attr(${PLACEHOLDER_ATTRIBUTE})`,
    position: "absolute",
    inset: "0",
    padding: "inherit",
    color: "#888",
    pointerEvents: "none",
    userSelect: "none",
  },
});

/** Contributes the placeholder for the configured text. */
function placeholderExtension(text: string): CMExtension[] {
  const line = Decoration.line({
    class: PLACEHOLDER_CLASS,
    attributes: { [PLACEHOLDER_ATTRIBUTE]: text },
  });

  return [
    placeholderTheme,
    EditorView.contentAttributes.of({ "aria-placeholder": text }),
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        private visible: boolean;

        constructor(view: EditorView) {
          this.visible = view.state.doc.length === 0;
          this.decorations = this.visible ? Decoration.set([line.range(0)]) : Decoration.none;
        }

        update(update: ViewUpdate) {
          const empty = update.state.doc.length === 0;
          if (empty === this.visible) return;

          this.visible = empty;
          this.decorations = empty ? Decoration.set([line.range(0)]) : Decoration.none;
        }
      },
      { decorations: (plugin) => plugin.decorations },
    ),
  ];
}

/**
 * Shows `options.placeholder` while the document is empty.
 *
 * The text is generated from the line's `data-inksane-placeholder` attribute,
 * so it never becomes document content and disappears as soon as the document
 * has any.
 */
export const PlaceholderExtension: Extension = {
  name: "placeholder",

  addCodeMirrorExtensions(ctx) {
    const text = ctx.editor.options.placeholder;
    if (!text) return [];

    return placeholderExtension(text);
  },
};
