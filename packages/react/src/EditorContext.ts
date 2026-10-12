import type { Editor } from "@inksane/core";
import { createContext } from "react";

/**
 * Holds the editor created by an EditorProvider.
 * Defaults to null so consumers can read it without a provider.
 */
export const EditorContext = createContext<Editor | null>(null);
