import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { indentLines } from "../helpers/indent.ts";
import type { Extension } from "../types/index.ts";

const DEFAULT_TAB_SIZE = 2;

/** Adds Tab/Shift+Tab keybindings that indent and dedent the selected lines. */
export const KeybindExtension: Extension = {
  name: "keybinds",

  addKeybinds(ctx) {
    // Read tabSize at press time so setOptions can change it at runtime.
    const indentUnit = () => " ".repeat(ctx.editor.options.tabSize ?? DEFAULT_TAB_SIZE);

    return [
      {
        key: "Tab",
        run(view) {
          const transaction = indentLines(view.state, 1, indentUnit());
          if (!transaction) return false;
          view.dispatch(transaction);
          return true;
        },
      },
      {
        key: "Shift-Tab",
        run(view) {
          const transaction = indentLines(view.state, -1, indentUnit());
          if (!transaction) return false;
          view.dispatch(transaction);
          return true;
        },
      },
    ];
  },
};

/**
 * Registers the standard editing keymap.
 *
 * `defaultKeymap` covers platform-standard editing: word and line deletion,
 * Home/End, line and document selection, moving and copying lines, and
 * CodeMirror's comment and indent commands. `searchKeymap` adds Find and
 * Replace, and `indentWithTab` indents through CodeMirror's language indent
 * unit.
 *
 * BaseKit registers it last so extension-specific bindings, such
 * as bold or link shortcuts, take precedence. The editor's own Tab binding in
 * {@link KeybindExtension} is registered earlier as well, so Tab keeps honoring
 * the `tabSize` option.
 *
 * Undo and redo stay with the history extension, which owns `historyKeymap`.
 */
export const DefaultKeymapExtension: Extension = {
  name: "defaultKeymap",

  addKeybinds() {
    return [...defaultKeymap, ...searchKeymap, indentWithTab];
  },
};
