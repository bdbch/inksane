import * as commands from "../commands/index.ts";
import type { Extension } from "../types/extensions.ts";

/** Built-in commands shipped with core. Registered by default. */
export const CommandsExtension: Extension = {
  name: "__tiptap_commands",
  addCommands: () => ({
    ...commands,
  }),
};
