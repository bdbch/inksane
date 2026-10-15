import type { Editor } from "../Editor.ts";
import type { Extension } from "../types/extensions.ts";

/**
 * Flattens the extension graph into one list.
 *
 * Child extensions are resolved recursively. Extensions are deduplicated by
 * name, so the first one with a given name wins. A child that leads back to an
 * extension already being resolved throws an error.
 *
 * @param editor - The editor instance.
 * @param extensions - The root extensions to resolve.
 * @returns The resolved extensions in resolution order.
 */
export function resolveExtensionsOnEditor(editor: Editor, extensions: Extension[]): Extension[] {
  const resolved: Extension[] = [];
  const resolvedNames = new Set<string>();
  const resolving = new Set<Extension>();

  const resolve = (ext: Extension) => {
    if (resolving.has(ext)) {
      throw new Error(`Cycle detected in extension graph involving extension: ${ext.name}`);
    }

    if (resolvedNames.has(ext.name)) {
      return;
    }

    resolving.add(ext);
    resolvedNames.add(ext.name);
    resolved.push(ext);

    for (const childExtension of ext.addExtensions?.({ editor }) ?? []) {
      resolve(childExtension);
    }

    resolving.delete(ext);
  };

  for (const ext of extensions) {
    resolve(ext);
  }

  return resolved;
}
