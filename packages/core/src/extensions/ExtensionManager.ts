import type { Extension as CMExtension } from "@codemirror/state";
import type { Editor } from "../editor/Editor.ts";
import type { InkwellExtension } from "./types.ts";

export class ExtensionManager {
  private editor: Editor;
  private _extensions: InkwellExtension[] = [];
  private _resolvedExtensions: InkwellExtension[] = [];
  private _cmExtensions: CMExtension[] = [];

  constructor(editor: Editor, extensions: InkwellExtension[]) {
    this.editor = editor;
    this._extensions = extensions;
    this._resolvedExtensions = this.resolveExtensions();
    this._cmExtensions = this.toCodeMirrorExtensions();
  }

  get extensions(): InkwellExtension[] {
    return [...this._extensions];
  }

  get cmExtensions(): CMExtension[] {
    return [...this._cmExtensions];
  }

  get resolvedExtensions(): InkwellExtension[] {
    return [...this._resolvedExtensions];
  }

  /** The resolved extension array, including child extensions */
  resolveExtensions(): InkwellExtension[] {
    const resolved: InkwellExtension[] = [];
    const visited = new Set<InkwellExtension>();
    const visitedNames = new Set<string>();

    // TODO: add name-guarding / deduping
    const resolve = (ext: InkwellExtension) => {
      if (visited.has(ext) || visitedNames.has(ext.name)) return;

      visited.add(ext);
      resolved.push(ext);
      visitedNames.add(ext.name);

      if (ext.addExtensions) {
        const childExtensions = ext.addExtensions({ editor: this.editor });
        for (const childExtension of childExtensions) {
          resolve(childExtension);
        }
      }
    };

    for (const ext of this._extensions) {
      resolve(ext);
    }

    return resolved;
  }

  public sortExtensionsByPrio(extensions: InkwellExtension[]): InkwellExtension[] {
    return [...extensions].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  public toCodeMirrorExtensions(): CMExtension[] {
    const cmExtensions: CMExtension[] = [];

    for (const ext of this.sortExtensionsByPrio(this.resolvedExtensions)) {
      if (ext.addCodeMirrorExtensions) {
        const cmExts = ext.addCodeMirrorExtensions({ editor: this.editor });
        cmExtensions.push(...cmExts);
      }
    }

    return cmExtensions;
  }
}
