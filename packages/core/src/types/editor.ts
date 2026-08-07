import type { EditorSelection, Transaction } from "@codemirror/state";
import type { InkwellExtension } from "./extensions.ts";
import type { Editor } from "~/Editor.ts";

export type EditorOptions = {
  element: HTMLElement;
  content?: string;
  extensions?: InkwellExtension[];
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
