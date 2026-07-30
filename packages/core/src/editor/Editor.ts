import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { EventEmitter } from "./EventEmitter.ts";
import type { EditorEvents, EditorOptions } from "./types.ts";

export class Editor extends EventEmitter<EditorEvents> {
  state: EditorState;
  view: EditorView;

  constructor(options: EditorOptions) {
    super();
    const { element, content } = options;

    this.emit("beforeCreate", { editor: this });

    this.state = EditorState.create({
      doc: content ?? "",
    });
    this.view = new EditorView({
      state: this.state,
      parent: element,
    });

    this.emit("create", { editor: this });
  }

  // TODO: extend destruction of editor instance here
  public destroy(): void {
    this.view.destroy();
  }
}
