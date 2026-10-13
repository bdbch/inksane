import { history, historyKeymap, redo } from "@codemirror/commands";
import type { Extension } from "../types/index.ts";

/**
 * Adds undo/redo to the editor.
 *
 * Included in BaseKit or registered individually. The
 * CodeMirror `history()` extension records document changes, including the
 * ones commands dispatch, so typing and command-based edits are both undoable.
 *
 * `historyKeymap` binds Mod-Z to undo and Mod-Y / Mod-Shift-Z to redo. It only
 * binds Mod-Shift-Z on macOS and Linux, so it is added explicitly as well to
 * keep redo on Mod-Shift-Z on every platform.
 */
export const HistoryExtension: Extension = {
  name: "history",

  addCodeMirrorExtensions() {
    return [history()];
  },

  addKeybinds() {
    return [
      ...historyKeymap,
      {
        key: "Mod-Shift-z",
        run: redo,
        preventDefault: true,
      },
    ];
  },
};
