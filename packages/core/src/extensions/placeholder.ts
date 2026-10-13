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

/** Attribute that holds the placeholder text. */
const PLACEHOLDER_ATTRIBUTE = "data-inksane-placeholder";

/** Styles for the placeholder text. Each key is a CSS property. */
export type PlaceholderThemeStyles = {
  [property: string]: string | number | null;
};

const defaultStyles: PlaceholderThemeStyles = {
  content: `attr(${PLACEHOLDER_ATTRIBUTE})`,
  position: "absolute",
  inset: "0",
  padding: "inherit",
  color: "#888",
  pointerEvents: "none",
  userSelect: "none",
};

/** Builds the style spec shared by the default and configured themes. */
const placeholderStyleSpec = (styles: PlaceholderThemeStyles = {}) => ({
  [`.${PLACEHOLDER_CLASS}`]: { position: "relative" },
  [`.${PLACEHOLDER_CLASS}::before`]: { ...defaultStyles, ...styles },
});

/**
 * Adjusts the styles of the placeholder text.
 *
 * Pass the result through the editor `theme` option. Only the properties you
 * want to change are needed, the rest keep their defaults.
 *
 * @example
 * ```ts
 * const editor = new Editor({
 *   placeholder: "Write something…",
 *   theme: placeholderTheme({ color: "#999", fontStyle: "italic" }),
 * });
 * ```
 */
export function placeholderTheme(styles: PlaceholderThemeStyles = {}): CMExtension {
  return EditorView.theme(placeholderStyleSpec(styles));
}

/**
 * Draws the placeholder as generated content on the line.
 *
 * CodeMirror's `placeholder` is a zero-width widget, which adds a
 * `cm-widgetBuffer` image before the text. That image can push the caret above
 * the placeholder. The text is drawn with `::before` outside the inline flow
 * instead, which keeps the caret at the start of the placeholder.
 */
const placeholderBaseTheme = EditorView.baseTheme(placeholderStyleSpec());

/** Builds the extensions that draw the placeholder. */
function placeholderExtension(text: string): CMExtension[] {
  const line = Decoration.line({
    class: PLACEHOLDER_CLASS,
    attributes: { [PLACEHOLDER_ATTRIBUTE]: text },
  });

  return [
    placeholderBaseTheme,
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
 * The text lives in a line decoration attribute, so it is not document content
 * and it disappears once the document has any.
 */
export const PlaceholderExtension: Extension = {
  name: "placeholder",

  addCodeMirrorExtensions(ctx) {
    const text = ctx.editor.options.placeholder;
    if (!text) return [];

    return placeholderExtension(text);
  },
};
