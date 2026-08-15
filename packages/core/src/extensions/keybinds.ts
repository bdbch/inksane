import { indentLines } from "../helpers/indent.ts";
import type { Extension } from "../types/index.ts";

const DEFAULT_TAB_SIZE = 2;

/** Adds Tab/Shift+Tab keybindings that indent and dedent the selected lines. */
export const KeybindExtension: Extension = {
  name: "keybinds",

  addKeybinds(ctx) {
    const unit = " ".repeat(ctx.editor.options.tabSize ?? DEFAULT_TAB_SIZE);

    return [
      {
        key: "Tab",
        run(view) {
          const transaction = indentLines(view.state, 1, unit);
          if (!transaction) return false;
          view.dispatch(transaction);
          return true;
        },
      },
      {
        key: "Shift-Tab",
        run(view) {
          const transaction = indentLines(view.state, -1, unit);
          if (!transaction) return false;
          view.dispatch(transaction);
          return true;
        },
      },
    ];
  },
};
