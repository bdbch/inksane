import type { Editor } from "@inksane/core";
import { useContext } from "react";
import { InksaneContext } from "./InksaneContext.ts";

/**
 * Reads the nearest inksane editor from context.
 *
 * @returns The editor, or null when no provider is above the caller.
 */
export function useInksaneContext(): Editor | null {
  return useContext(InksaneContext);
}
