import type { EditorOptions } from "@inksane/core";

/** Editor options without the mount element, which the binding owns. */
export type UseInksaneOptions = Omit<EditorOptions, "element">;
