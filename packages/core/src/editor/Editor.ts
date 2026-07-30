import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { EventEmitter } from "./EventEmitter.ts";
import type { EditorEvents, EditorOptions } from "./types.ts";

export class Editor extends EventEmitter<EditorEvents> {
  options: EditorOptions;
  state: EditorState;
  view: EditorView;

  constructor(options: EditorOptions) {
    super();
    this.options = options;
    const { element, content } = this.options;

    this.emit("beforeCreate", { editor: this });

    this.state = EditorState.create({
      doc: content ?? "",
    });
    this.view = new EditorView({
      state: this.state,
      parent: element,
    });

    // @ts-expect-error we set the editor here so users can access the editor object from the DOM element
    this.options.element["editor"] = this;

    this.emit("create", { editor: this });
  }

  // TODO: extend destruction of editor instance here
  public destroy(): void {
    this.view.destroy();
  }

  get content(): string {
    return this.state.doc.toString();
  }

  get json(): string[] {
    return this.state.doc.toJSON();
  }
}
