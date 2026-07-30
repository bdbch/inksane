import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { EventEmitter } from "./EventEmitter.ts";
import type { EditorEvents, EditorOptions } from "./types.ts";

export class Editor extends EventEmitter<EditorEvents> {
  options: EditorOptions;
  view: EditorView;

  get state(): EditorState {
    return this.view.state;
  }

  public get content(): string {
    return this.state.doc.toString();
  }

  public get json(): string[] {
    return this.state.doc.toJSON();
  }

  constructor(options: EditorOptions) {
    super();
    this.options = options;
    const { element, content } = this.options;

    this.emit("beforeCreate", { editor: this });

    const initialState = EditorState.create({
      doc: content ?? "",
    });

    this.view = new EditorView({
      state: initialState,
      parent: element,
    });
    this.setupDOM();

    this.emit("create", { editor: this });
  }

  // TODO: extend destruction of editor instance here
  public destroy(): void {
    this.view.destroy();
  }

  private setupDOM(): void {
    this.view.dom.dataset.inkwellEditor = "";
    this.view.dom.classList.add("inkwell-editor");

    this.view.contentDOM.dataset.inkwellEditorContent = "";
    this.view.contentDOM.classList.add("inkwell-editor--content");

    // @ts-expect-error we set the editor here so users can access the editor object from the DOM element
    this.options.element["editor"] = this;

    // @ts-expect-error we set the editor here so users can access the editor object from the DOM element
    this.view.dom["editor"] = this;

    // @ts-expect-error we set the editor here so users can access the editor object from the DOM element
    this.view.contentDOM["editor"] = this;
  }
}
