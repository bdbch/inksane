import { EditorState, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { EventEmitter } from "./EventEmitter.ts";
import type { EditorEvents, EditorOptions } from "./types/editor.ts";
import { ExtensionManager } from "./ExtensionManager.ts";
import type { ChainedCommands, SingleCommands } from "./types/commands.ts";
import { CommandChain } from "./CommandChain.ts";
import {
  BoldExtension,
  CodeExtension,
  CommandsExtension,
  HeadingExtension,
  HorizontalRuleExtension,
  ImageExtension,
  ItalicExtension,
  LinkExtension,
} from "./extensions/index.ts";

export class Editor extends EventEmitter<EditorEvents> {
  private _te: TextEncoder = new TextEncoder();
  private _td: TextDecoder = new TextDecoder();
  private _extensionManager: ExtensionManager;

  options: EditorOptions;
  view: EditorView;

  get state(): EditorState {
    return this.view.state;
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
    this._extensionManager = new ExtensionManager(this, [
      CommandsExtension,
      BoldExtension,
      ItalicExtension,
      LinkExtension,
      HeadingExtension,
      HorizontalRuleExtension,
      ImageExtension,
      CodeExtension,
      ...(this.options?.extensions ?? []),
    ]);

    this.emit("beforeCreate", { editor: this });

    const editorViewExtensions = [];

    if (this.options.theme) {
      editorViewExtensions.push(this.options.theme);
    }

    const initialState = EditorState.create({
      doc: content ?? "",
      extensions: [...editorViewExtensions, ...this._extensionManager.cmExtensions],
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
    if (this.options.classNames?.editor) {
      const editorClasses = this.options.classNames.editor.split(" ");
      for (let i = 0; i < editorClasses.length; i++) {
        this.view.dom.classList.add(editorClasses[i]);
      }
    }

    this.view.contentDOM.dataset.inkwellEditorContent = "";
    this.view.contentDOM.classList.add("inkwell-editor--content");
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
