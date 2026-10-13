import { EditorState, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { editorFocusField } from "./editorFocus.ts";
import { EventEmitter } from "./EventEmitter.ts";
import type { EditorEvents, EditorOptions } from "./types/editor.ts";
import { ExtensionManager } from "./ExtensionManager.ts";
import type { ChainedCommands, SingleCommands } from "./types/commands.ts";
import { CommandChain } from "./CommandChain.ts";
import {
  BlockquoteExtension,
  BoldExtension,
  CodeExtension,
  CommandsExtension,
  HeadingExtension,
  HorizontalRuleExtension,
  HtmlExtension,
  ImageExtension,
  KeybindExtension,
  ItalicExtension,
  LinkExtension,
  ListExtension,
} from "./extensions/index.ts";

export class Editor extends EventEmitter<EditorEvents> {
  private _te: TextEncoder = new TextEncoder();
  private _td: TextDecoder = new TextDecoder();
  private _extensionManager: ExtensionManager;

  /** Holds the editor state until the view is created on mount. */
  private _state: EditorState;

  /** Holds the CodeMirror view once mounted, or null while detached. */
  private _view: EditorView | null = null;

  options: EditorOptions;

  /**
   * The CodeMirror view.
   * @throws When the editor is not mounted yet. Check {@link isMounted} first.
   */
  get view(): EditorView {
    if (!this._view) {
      throw new Error("Editor is not mounted. Call mount(element) first.");
    }
    return this._view;
  }

  /** Whether the editor is attached to a DOM element. */
  get isMounted(): boolean {
    return this._view !== null;
  }

  get state(): EditorState {
    return this._view?.state ?? this._state;
  }

  /** Whether the editor currently has DOM focus. */
  get focused(): boolean {
    return this.state.field(editorFocusField);
  }

  /** Starts a command chain. State is snapshotted at run(), not here. */
  chain(): ChainedCommands {
    return CommandChain.create(this, this._extensionManager.commands);
  }

  /** Bound commands that run immediately as one-step chains. */
  get commands(): SingleCommands {
    return this.buildCommands();
  }

  /** Builds the bound commands object from the registry. */
  private buildCommands(): SingleCommands {
    const registry = this._extensionManager.commands;
    const bound = {} as Record<string, (...args: unknown[]) => boolean>;

    for (const name of Object.keys(registry)) {
      bound[name] = (...args: unknown[]) => {
        const chain = CommandChain.create(this, registry);
        // Proxy forwards unknown keys to add(name, args), returns the chain.
        (chain as unknown as Record<string, (...args: unknown[]) => ChainedCommands>)[name](
          ...args,
        );
        return chain.run();
      };
    }

    return bound as unknown as SingleCommands;
  }

  public get content(): string {
    return this.state.doc.toString();
  }

  public set content(newContent: string) {
    this.applyChanges({
      from: 0,
      to: this.state.doc.length,
      insert: newContent,
    });
  }

  public get json(): string[] {
    return this.state.doc.toJSON();
  }

  public set json(newContent: string[]) {
    this.applyChanges({
      from: 0,
      to: this.state.doc.length,
      insert: Text.of(newContent),
    });
  }

  public get binary(): Uint8Array<ArrayBuffer> {
    return this._te.encode(this.content);
  }

  public set binary(newContent: Uint8Array<ArrayBuffer>) {
    this.content = this._td.decode(newContent);
  }

  /** Applies document changes to the view, or to the pending state before mount. */
  private applyChanges(changes: { from: number; to: number; insert: string | Text }): void {
    if (this._view) {
      this._view.dispatch({ changes });
    } else {
      this._state = this._state.update({ changes }).state;
    }
  }

  constructor(options: EditorOptions) {
    super();
    this.options = options;
    const { element, content } = this.options;
    this._extensionManager = new ExtensionManager(this, [
      CommandsExtension,
      BoldExtension,
      ItalicExtension,
      LinkExtension,
      HeadingExtension,
      HorizontalRuleExtension,
      HtmlExtension,
      ImageExtension,
      CodeExtension,
      BlockquoteExtension,
      ListExtension,
      KeybindExtension,
      ...(this.options?.extensions ?? []),
    ]);
    this._extensionManager.bindEventHandlers();

    this.emit("beforeCreate", { editor: this });

    const editorViewExtensions = [];

    if (this.options.theme) {
      editorViewExtensions.push(this.options.theme);
    }

    if (this.options.lineWrapping !== false) {
      editorViewExtensions.push(EditorView.lineWrapping);
    }

    this._state = EditorState.create({
      doc: content ?? "",
      extensions: [...editorViewExtensions, ...this._extensionManager.cmExtensions],
    });

    if (element) {
      this.mount(element);
    }

    this.emit("create", { editor: this });
  }

  /**
   * Attaches the editor to a DOM element and creates the CodeMirror view.
   * Call this when no element was passed to the constructor, as framework
   * bindings do once their mount node exists. Later calls are ignored.
   */
  public mount(element: HTMLElement): void {
    if (this._view) return;

    this.options.element = element;
    this._view = new EditorView({
      state: this._state,
      parent: element,
    });
    this.setupDOM();

    this.emit("mount", { editor: this });
  }

  // TODO: extend destruction of editor instance here
  public destroy(): void {
    try {
      if (this._view) {
        try {
          this.emit("unmount", { editor: this });
        } finally {
          this._view.destroy();
          this._view = null;
        }
      }

      this.emit("destroy", { editor: this });
    } finally {
      // Runs even when an extension handler throws, so no listeners leak.
      this._extensionManager.unbindEventHandlers();
    }
  }

  private setupDOM(): void {
    this.view.dom.dataset.inksaneEditor = "";
    this.view.dom.classList.add("inksane-editor");
    if (this.options.classNames?.editor) {
      const editorClasses = this.options.classNames.editor.split(" ");
      for (let i = 0; i < editorClasses.length; i++) {
        this.view.dom.classList.add(editorClasses[i]);
      }
    }

    this.view.contentDOM.dataset.inksaneEditorContent = "";
    this.view.contentDOM.classList.add("inksane-editor--content");
    if (this.options.classNames?.editable) {
      const editableClasses = this.options.classNames.editable.split(" ");
      for (let i = 0; i < editableClasses.length; i++) {
        this.view.contentDOM.classList.add(editableClasses[i]);
      }
    }

    // @ts-expect-error we set the editor here so users can access the editor object from the DOM element
    this.options.element["editor"] = this;

    // @ts-expect-error we set the editor here so users can access the editor object from the DOM element
    this.view.dom["editor"] = this;

    // @ts-expect-error we set the editor here so users can access the editor object from the DOM element
    this.view.contentDOM["editor"] = this;
  }
}
