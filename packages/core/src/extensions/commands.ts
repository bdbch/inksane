import * as commands from "../commands/index.ts";
import type { InkwellExtension } from "../types/extensions.ts";

/** Built-in commands shipped with core. Registered by default. */
export const CommandsExtension: InkwellExtension = {
  name: "__tiptap_commands",
  addCommands: () => ({
    ...commands,
  }),
};
