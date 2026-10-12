import type { PropsWithChildren } from "react";
import { EditorContext } from "./EditorContext.ts";
import type { UseEditorOptions } from "./types.ts";
import { useEditor } from "./useEditor.ts";

/** Options for EditorProvider: editor options plus children. */
export type EditorProviderProps = PropsWithChildren<UseEditorOptions>;

/**
 * Creates one editor and shares it with the component tree through context.
 * Render EditorContent below it to mount the editor into the DOM.
 */
export function EditorProvider({ children, ...options }: EditorProviderProps) {
  const editor = useEditor(options);

  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>;
}
