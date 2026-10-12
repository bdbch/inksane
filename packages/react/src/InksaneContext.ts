import type { Editor } from "@inksane/core";
import { createContext } from "react";

/**
 * Holds the editor created by an InksaneProvider.
 * Defaults to null so consumers can read it without a provider.
 */
export const InksaneContext = createContext<Editor | null>(null);
