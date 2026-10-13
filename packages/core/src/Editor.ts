import { Compartment, EditorState, Prec, Text, Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { editorFocusField } from "./editorFocus.ts";
import { EventEmitter } from "./EventEmitter.ts";
import type { EditorEvents, EditorOptions } from "./types/editor.ts";
import type { Extension as InksaneExtension } from "./types/extensions.ts";
import { ExtensionManager } from "./ExtensionManager.ts";
import type { ChainedCommands, SingleCommands } from "./types/commands.ts";
import { canRunCommand, CommandChain, createBoundCommands } from "./CommandChain.ts";
import { getActiveMarkRange, isQueryActive } from "./helpers/stateQueries.ts";
import type { Range } from "./types/index.ts";
import {
  BlockquoteExtension,
  BoldExtension,
  CodeExtension,
  CommandsExtension,
  DefaultKeymapExtension,
  HeadingExtension,
  HorizontalRuleExtension,
  HistoryExtension,
  HtmlExtension,
  ImageExtension,
  KeybindExtension,
  ItalicExtension,
  LinkExtension,
  ListExtension,
  PlaceholderExtension,
} from "./extensions/index.ts";

/**
 * Extensions every editor starts with, in setup order. A configured extension
 * with the same name replaces the built-in, so a feature can be set up with its
 * own options.
 */
const BUILT_IN_EXTENSIONS: InksaneExtension[] = [
  CommandsExtension,
  HistoryExtension,
  BoldExtension,
  ItalicExtension,
  LinkExtension(),
  PlaceholderExtension,
  HeadingExtension,
  HorizontalRuleExtension,
  HtmlExtension,
  ImageExtension,
  CodeExtension,
  BlockquoteExtension,
  ListExtension,
  KeybindExtension,
  DefaultKeymapExtension,
];

export class Editor extends EventEmitter<EditorEvents> {
  private _te: TextEncoder = new TextEncoder();
  private _td: TextDecoder = new TextDecoder();
  private _extensionManager: ExtensionManager;
  private _editable = new Compartment();

  /** Holds the editor state until the view is created on mount. */
  private _state: EditorState | null;

  /** Holds the CodeMirror view once mounted, or null while detached. */
  private _view: EditorView | null = null;
  private _destroyed = false;

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

  /** The current state. Throws after the editor has been destroyed. */
  get state(): EditorState {
    const state = this._view?.state ?? this._state;
    if (!state) throw new Error("Editor is destroyed.");
    return state;
  }

  /**
   * Enables or disables user editing without replacing the document or selection.
   * Works before mount. Programmatic content loading remains available.
   *
   * @param editable - Whether input and commands may edit the document.
   */
  public setEditable(editable: boolean): void {
    this.options.editable = editable;
    const spec = { effects: this._editable.reconfigure(EditorState.readOnly.of(!editable)) };
    if (this._view) {
      this._view.dispatch(spec);
    } else {
      this._state = this.state.update(spec).state;
    }
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
    return createBoundCommands(this, this._extensionManager.commands);
  }

  /**
   * Whether a mark or node is active at the current selection.
   *
   * @param name - The logical name declared by an extension, such as `bold`,
   * `link`, `heading`, `bulletList`, `codeBlock`, or `blockquote`.
   * @param attrs - Optional attributes to match, such as `{ level: 1 }` for a
   * heading or `{ href }` for a link.
   * @returns True when a matching mark or node covers the selection.
   */
  public isActive(name: string, attrs?: Record<string, unknown>): boolean {
    return isQueryActive(this.state, this._extensionManager.stateQueries, name, attrs);
  }

  /**
   * The range of a mark around the current selection.
   *
   * @param name - Optional logical mark name. Without it, the innermost mark
   * around the selection is returned.
   * @returns The range, or null when no matching mark is active.
   */
  public getMarkRange(name?: string): Range | null {
    return getActiveMarkRange(this.state, this._extensionManager.stateQueries, name);
  }

  /**
   * Whether a command would succeed, evaluated against a projected copy of the
   * current state. The editor is not changed and nothing is dispatched.
   *
   * @param command - The command name, such as `toggleBold`.
   * @param args - The arguments the command would receive.
   * @returns False in read-only mode, otherwise the boolean the command would return.
   */
  public canRun<K extends keyof SingleCommands>(
    command: K,
    ...args: Parameters<SingleCommands[K]>
  ): boolean {
    return canRunCommand(this, this._extensionManager.commands, command as string, args);
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

  /**
   * The document serialized as Markdown.
   *
   * This is the editor's source format, so it round-trips with
   * {@link setMarkdown}. Use it as the primary way to read the document.
   */
  public getMarkdown(): string {
    return this.content;
  }

  /**
   * Replaces the whole document with Markdown.
   *
   * @param markdown - The Markdown source to load.
   */
  public setMarkdown(markdown: string): void {
    this.content = markdown;
  }

  /**
   * The document as CodeMirror's `Text` JSON shape, one string per line, for
   * example `["# Title", "", "Body"]`.
   *
   * Prefer {@link getMarkdown} unless the raw line array is specifically
   * needed. The name `json` never described this shape and is deprecated.
   */
  public get textJSON(): string[] {
    return this.state.doc.toJSON();
  }

  public set textJSON(newContent: string[]) {
    this.applyChanges({
      from: 0,
      to: this.state.doc.length,
      insert: Text.of(newContent),
    });
  }

  /**
   * @deprecated Use {@link getMarkdown} to read the document, or
   * {@link textJSON} for the raw CodeMirror line array. `json` returns a
   * `string[]` line array, not a document AST, and will be removed in a future
   * major release.
   */
  public get json(): string[] {
    return this.textJSON;
  }

  /** @deprecated Use {@link setMarkdown} or {@link textJSON}. */
  public set json(newContent: string[]) {
    this.textJSON = newContent;
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
      this._view.dispatch({ changes, filter: false });
    } else {
      this._state = this.state.update({ changes, filter: false }).state;
    }
  }

  /**
   * Combines the built-in extensions with the configured ones. Configured
   * extensions win by name, which is how a built-in feature, such as links, is
   * given options.
   */
  private resolveExtensions(): InksaneExtension[] {
    const configured = this.options.extensions ?? [];
    const overridden = new Set(configured.map((extension) => extension.name));

    const builtIns =
      this.options.defaultKeymap === false
        ? BUILT_IN_EXTENSIONS.filter((extension) => extension.name !== "defaultKeymap")
        : BUILT_IN_EXTENSIONS;

    return [...builtIns.filter((extension) => !overridden.has(extension.name)), ...configured];
  }

  constructor(options: EditorOptions) {
    super();
    this.options = options;
    const { element, content } = this.options;
    this._extensionManager = new ExtensionManager(this, this.resolveExtensions());

    this.emit("beforeCreate", { editor: this });

    const editorViewExtensions = [];

    if (this.options.theme) {
      editorViewExtensions.push(this.options.theme);
    }

    if (this.options.lineWrapping !== false) {
      editorViewExtensions.push(EditorView.lineWrapping);
    }

    editorViewExtensions.push(
      this._editable.of(EditorState.readOnly.of(this.options.editable === false)),
      // Run after other filters so remote updates can be identified first.
      Prec.highest(
        EditorState.transactionFilter.of((transaction) => {
          if (
            transaction.startState.readOnly &&
            transaction.docChanged &&
            !transaction.annotation(Transaction.remote)
          ) {
            return [];
          }
          return transaction;
        }),
      ),
      EditorView.editable.compute([EditorState.readOnly], (state) => !state.readOnly),
      // Read-only content must remain reachable by keyboard for selection and scrolling.
      EditorView.contentAttributes.of({ tabindex: "0" }),
      EditorView.updateListener.of((update) => {
        const transaction = update.transactions.at(-1);

        if (update.docChanged && transaction) {
          this.emit("update", { editor: this, transaction });
        }

        if (update.selectionSet) {
          this.emit("selectionUpdate", { editor: this, selection: update.state.selection });
        }
      }),
    );

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
   * bindings do once their mount node exists. Later calls and calls after
   * destruction are ignored. Create a new editor to mount again.
   */
  public mount(element: HTMLElement): void {
    if (this._view || this._destroyed) return;

    this.options.element = element;
    this._view = new EditorView({
      state: this.state,
      parent: element,
    });
    this.setupDOM();

    this.emit("mount", { editor: this });
  }

  /** Releases the view, DOM references, state, and listeners. Repeated calls do nothing. */
  public destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    const view = this._view;
    const nodes = [this.options.element, view?.dom, view?.contentDOM];
    try {
      if (view) {
        try {
          this.emit("unmount", { editor: this });
        } finally {
          view.destroy();
          this._view = null;
        }
      }

      this.emit("destroy", { editor: this });
    } finally {
      for (const node of nodes) {
        if (node && "editor" in node && node.editor === this) delete node.editor;
      }
      delete this.options.element;
      this._view = null;
      this._state = null;
      this.removeListeners();
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
