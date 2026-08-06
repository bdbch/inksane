import type { InkwellExtension } from "../extensions/types.ts";
import { cutContent } from "./cutContent.ts";
import { insertContent } from "./insertContent.ts";
import { setContent } from "./setContent.ts";

/** Built-in commands shipped with core. Registered by default. */
export const coreExtensions: InkwellExtension = {
  name: "__tiptap_coreCommands",
  addCommands: () => ({
    insertContent,
    setContent,
    cutContent,
  }),
};
