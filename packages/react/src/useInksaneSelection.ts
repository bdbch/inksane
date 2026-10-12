import type { Editor, EditorEvents } from "@inksane/core";
import { useEffect, useState } from "react";
import { useInksaneContext } from "./useInksaneContext.ts";

/** The editor's current selection. */
export type InksaneSelection = EditorEvents["selectionUpdate"]["selection"];

/**
 * Reads the editor selection and re-renders when it changes.
 *
 * @param editor - Editor to watch. Defaults to the nearest editor from context.
 * @returns The current selection, or null before the editor exists.
 */
export function useInksaneSelection(editor?: Editor | null): InksaneSelection | null {
  const contextEditor = useInksaneContext();
  const instance = editor ?? contextEditor;
  const [selection, setSelection] = useState<InksaneSelection | null>(null);

  useEffect(() => {
    if (!instance) {
      setSelection(null);
      return;
    }

    setSelection(instance.state.selection);

    const handleSelection = ({ selection: next }: EditorEvents["selectionUpdate"]) => {
      setSelection(next);
    };

    instance.on("selectionUpdate", handleSelection);

    return () => {
      instance.off("selectionUpdate", handleSelection);
    };
  }, [instance]);

  return selection;
}
