import type { Editor } from "../Editor.ts";
import type { Extension } from "../types/extensions.ts";

/**
 * Resolves the extensions by resolving child extensions and returning a flat list of all extensions + deduplicating by name.
 *
 * @param editor The editor instance.
 * @param extensions The extensions to resolve.
 * @returns The resolved extensions.
 */
export function resolveExtensionsOnEditor(editor: Editor, extensions: Extension[]): Extension[] {
  const resolved: Extension[] = [];
  const resolvedChildren = new Set<Extension>();
  const visitedChildren = new Set<Extension>();
  const visited = new Set<Extension>();
  const visitedNames = new Set<string>();

  // TODO: add name-guarding / deduping
  const resolve = (ext: Extension) => {
    if (resolvedChildren.has(ext)) {
      return;
    }

    if (visitedChildren.has(ext)) {
      throw new Error(`Cycle detected in extension graph involving extension: ${ext.name}`);
    }

    if (visited.has(ext) || visitedNames.has(ext.name)) {
      throw new Error(`Duplicate extension name detected: ${ext.name}`);
    }

    visited.add(ext);
    resolved.push(ext);
    visitedNames.add(ext.name);

    if (ext.addExtensions) {
      visitedChildren.add(ext);
      const childExtensions = ext.addExtensions({ editor });
      for (const childExtension of childExtensions) {
        resolve(childExtension);
        resolvedChildren.add(childExtension);
      }
      visitedChildren.delete(ext);
    }
  };

  for (const ext of extensions) {
    resolve(ext);
  }

  return resolved;
}
