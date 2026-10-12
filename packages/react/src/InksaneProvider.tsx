import type { PropsWithChildren } from "react";
import { InksaneContext } from "./InksaneContext.ts";
import type { UseInksaneOptions } from "./types.ts";
import { useInksane } from "./useInksane.ts";

/** Options for InksaneProvider: editor options plus children. */
export type InksaneProviderProps = PropsWithChildren<UseInksaneOptions>;

/**
 * Creates one editor and shares it with the component tree through context.
 * Render Inksane below it to mount the editor into the DOM.
 */
export function InksaneProvider({ children, ...options }: InksaneProviderProps) {
  const editor = useInksane(options);

  return <InksaneContext.Provider value={editor}>{children}</InksaneContext.Provider>;
}
