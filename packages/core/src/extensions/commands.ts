import * as commands from "../commands/index.ts";
import type { Extension } from "../types/extensions.ts";

/** Registers the document commands available in every editor. */
export const CommandsExtension: Extension = {
  name: "coreCommands",
  addCommands: () => ({
    ...commands,
  }),
};
