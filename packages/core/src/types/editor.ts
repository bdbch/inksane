import type { EditorSelection, Extension as CMExtension, Transaction } from "@codemirror/state";
import type { Extension } from "./extensions.ts";
import type { Editor } from "../Editor.ts";

export type EditorOptions = {
  element: HTMLElement;
  content?: string;
  extensions?: Extension[];
  theme?: CMExtension;
  /**
   * The number of spaces Tab and Shift+Tab use when indenting. Defaults to 2.
   */
  tabSize?: number;
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
