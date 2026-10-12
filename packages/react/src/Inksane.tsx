import type { Editor } from "@inksane/core";
import { useContext, useEffect, useRef } from "react";
import { InksaneContext } from "./InksaneContext.ts";

/** Props for Inksane. */
export type InksaneProps = {
  /** Editor to mount. Defaults to the nearest editor from context. */
  editor?: Editor | null;
  /** Class name applied to the mount element. */
  className?: string;
};

/**
 * Renders the element the editor mounts into. Give it the editor directly, or
 * place it under an InksaneProvider and read the editor from context.
 */
export function Inksane({ editor: editorProp, className }: InksaneProps) {
  const contextEditor = useContext(InksaneContext);
  const editor = editorProp ?? contextEditor;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editor && ref.current) {
      editor.mount(ref.current);
    }
  }, [editor]);

  return <div ref={ref} className={className} />;
}
