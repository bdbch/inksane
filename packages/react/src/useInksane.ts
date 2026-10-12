import { Editor } from "@inksane/core";
import { useEffect, useRef, useState } from "react";
import type { UseInksaneOptions } from "./types.ts";

/**
 * Creates an inksane editor for the component lifetime.
 *
 * The editor is created after the first render, so this returns null on that
 * render. Pass it to Inksane to mount it, or provide it to the tree with
 * InksaneProvider and read it with useInksaneContext.
 *
 * Options are read once at creation. `content` stays in sync with later
 * changes. Other options are not updated after mount.
 *
 * @param options - Editor options without `element`. The binding owns the element.
 * @returns The editor, or null before it exists.
 */
export function useInksane(options: UseInksaneOptions = {}): Editor | null {
  const [editor, setEditor] = useState<Editor | null>(null);
  const initialOptions = useRef(options);

  useEffect(() => {
    const instance = new Editor({ ...initialOptions.current });
    setEditor(instance);

    return () => {
      instance.destroy();
      setEditor(null);
    };
  }, []);

  const content = options.content;

  useEffect(() => {
    if (editor && content !== undefined && editor.content !== content) {
      editor.content = content;
    }
  }, [editor, content]);

  return editor;
}
