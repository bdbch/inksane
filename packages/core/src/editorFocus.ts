import { Annotation, type Extension, StateField } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

const setEditorFocus = Annotation.define<boolean>();

/** Stores whether the editor currently has DOM focus. */
export const editorFocusField = StateField.define<boolean>({
  create: () => false,
  update: (value, transaction) => transaction.annotation(setEditorFocus) ?? value,
});

/** Adds editor focus tracking to a CodeMirror editor state. */
export const editorFocusExtension: Extension = [
  editorFocusField,
  EditorView.domEventHandlers({
    focus: (_, view) => {
      if (!view.state.field(editorFocusField)) {
        view.dispatch({ annotations: setEditorFocus.of(true) });
      }
    },
    blur: (_, view) => {
      if (view.state.field(editorFocusField)) {
        view.dispatch({ annotations: setEditorFocus.of(false) });
      }
    },
  }),
];
