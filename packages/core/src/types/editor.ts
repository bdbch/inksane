import type { EditorSelection, Extension, Transaction } from "@codemirror/state";
import type { InkwellExtension } from "./extensions.ts";
import type { Editor } from "../Editor.ts";

export type EditorOptions = {
  element: HTMLElement;
  content?: string;
  extensions?: InkwellExtension[];
  theme?: Extension;
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
