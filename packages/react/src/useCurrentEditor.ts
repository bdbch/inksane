import type { Editor } from "@inksane/core";
import { useContext } from "react";
import { EditorContext } from "./EditorContext.ts";

/**
 * Reads the nearest inksane editor from context.
 *
 * @returns The editor, or null when no provider is above the caller.
 */
export function useCurrentEditor(): Editor | null {
  return useContext(EditorContext);
}
