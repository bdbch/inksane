import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

// TODO: move out into a separate file
type EditorOptions = {
  element: HTMLElement;
};

export class Editor {
  state: EditorState;
  view: EditorView;

  constructor(options: EditorOptions) {
    const { element } = options;

    // TODO: extend options to create correct EditorState and EditorView instances
    this.state = EditorState.create();
    this.view = new EditorView({
      state: this.state,
      parent: element,
    });
  }
}
