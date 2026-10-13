import type { EditorSelection, Extension as CMExtension, Transaction } from "@codemirror/state";
import type { Extension } from "./extensions.ts";
import type { Editor } from "../Editor.ts";

export type EditorOptions = {
  /**
   * The element the editor mounts into. Optional when the editor is created
   * before its mount node exists, as framework bindings do. Call
   * {@link Editor.mount} to attach it once the node is available.
   */
  element?: HTMLElement;
  content?: string;
  /** Allow user input and commands. Defaults to true. Content setters still work. */
  editable?: boolean;
  /**
   * Extensions to add. An extension replaces the built-in with the same name,
   * so a built-in feature can be configured with its own options.
   */
  extensions?: Extension[];
  theme?: CMExtension;
  /** Wrap long lines instead of allowing horizontal overflow. Defaults to true. */
  lineWrapping?: boolean;
  /**
   * Text shown while the document is empty. Omit it, or pass an empty string,
   * to show nothing.
   */
  placeholder?: string;
  /**
   * The number of spaces Tab and Shift+Tab use when indenting. Defaults to 2.
   */
  tabSize?: number;
  /**
   * Whether the standard editing keymap is registered. Covers common editing
   * keys such as word deletion, Home/End, line selection, and Find. Defaults to
   * true. Set to false to opt out and register your own keymap.
   *
   * Passing an extension named `defaultKeymap` replaces the built-in instead,
   * which is how the keymap is extended with more bindings.
   */
  defaultKeymap?: boolean;
  classNames?: {
    editor?: string;
    editable?: string;
  };
};

export type EditorEvents = {
  mount: {
    editor: Editor;
  };
  unmount: {
    editor: Editor;
  };
  beforeCreate: {
    editor: Editor;
  };
  create: {
    editor: Editor;
  };
  update: {
    editor: Editor;
    transaction: Transaction;
  };
  destroy: {
    editor: Editor;
  };
  selectionUpdate: {
    editor: Editor;
    selection: EditorSelection;
  };
  beforeTransaction: {
    editor: Editor;
    transaction: Transaction;
  };
  transaction: {
    editor: Editor;
    transaction: Transaction;
  };
};
