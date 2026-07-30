import type { EditorSelection, Transaction } from "@codemirror/state";
import type { EditorViewConfig } from "@codemirror/view";
import type { Editor } from "./Editor.ts";

export type EditorOptions = Omit<EditorViewConfig, "parent" | "state"> & {
  element: HTMLElement;
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
