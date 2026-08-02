import { EditorState, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { EventEmitter } from "./EventEmitter.ts";
import type { EditorEvents, EditorOptions } from "./types.ts";
import { ExtensionManager } from "../extensions/index.ts";

export class Editor extends EventEmitter<EditorEvents> {
  private _te: TextEncoder = new TextEncoder();
  private _td: TextDecoder = new TextDecoder();
  private _extensionManager: ExtensionManager;

  options: EditorOptions;
  view: EditorView;

  get state(): EditorState {
    return this.view.state;
  }

  public get content(): string {
    return this.state.doc.toString();
  }

  public set content(newContent: string) {
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: newContent,
      },
    });
  }

  public get json(): string[] {
    return this.state.doc.toJSON();
  }

  public set json(newContent: string[]) {
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: Text.of(newContent),
      },
    });
  }

  public get binary(): Uint8Array<ArrayBuffer> {
    return this._te.encode(this.content);
  }

  public set binary(newContent: Uint8Array<ArrayBuffer>) {
    this.content = this._td.decode(newContent);
  }

  constructor(options: EditorOptions) {
    super();
    this.options = options;
    const { element, content } = this.options;
    this._extensionManager = new ExtensionManager(this, this.options?.extensions ?? []);

    const editorExtensions = [
      ...this._extensionManager.cmExtensions,
      this._extensionManager.keybindings,
    ];

    this.emit("beforeCreate", { editor: this });

    const initialState = EditorState.create({
      doc: content ?? "",
      extensions: editorExtensions,
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
