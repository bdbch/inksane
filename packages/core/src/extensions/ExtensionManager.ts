import type { Extension as CMExtension } from "@codemirror/state";
import { type KeyBinding, keymap } from "@codemirror/view";
import type { Editor } from "../editor/Editor.ts";
import type { InkwellExtension } from "./types.ts";

export class ExtensionManager {
  private editor: Editor;
  private _extensions: InkwellExtension[] = [];
  private _resolvedExtensions: InkwellExtension[] = [];
  private _cmExtensions: CMExtension[] = [];
  private _keybindings: KeyBinding[] = [];

  constructor(editor: Editor, extensions: InkwellExtension[]) {
    this.editor = editor;
    this._extensions = extensions;
    this._resolvedExtensions = this.resolveExtensions();

    for (const ext of this.sortExtensionsByPrio(this._resolvedExtensions)) {
      if (ext.addNodes) this.bindNodes(ext.addNodes);
      if (ext.addMarks) this.bindMarks(ext.addMarks);
      if (ext.addCommands) this.bindCommands(ext.addCommands);
      if (ext.addKeybinds) this.bindKeymaps(ext.addKeybinds);
      if (ext.addCodeMirrorExtensions) this.bindCmExtensions(ext.addCodeMirrorExtensions);
    }
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

  get keybindings(): CMExtension {
    return keymap.of(this._keybindings);
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

  private bindNodes(addNodes: NonNullable<InkwellExtension["addNodes"]>) {
    console.log(addNodes({ editor: this.editor }));
    // TODO: implement node binding logic, noop for now
  }

  private bindMarks(addMarks: NonNullable<InkwellExtension["addMarks"]>) {
    console.log(addMarks({ editor: this.editor }));
    // TODO: implement mark binding logic, noop for now
  }

  private bindCommands(addCommands: NonNullable<InkwellExtension["addCommands"]>) {
    console.log(addCommands({ editor: this.editor }));
    // TODO: implement command binding logic, noop for now
  }

  /**
   * Binds keymaps from all resolved extensions.
   * @returns An array of KeyBinding objects from all resolved extensions.
   */
  private bindKeymaps(addKeybinds: NonNullable<InkwellExtension["addKeybinds"]>) {
    const keyBinds =
      addKeybinds({ editor: this.editor })?.filter((kb): kb is KeyBinding => kb !== undefined) ??
      [];
    this._keybindings.push(...keyBinds);
  }

  private bindCmExtensions(
    addCodeMirrorExtensions: NonNullable<InkwellExtension["addCodeMirrorExtensions"]>,
  ) {
    const cmExtensions: CMExtension[] = addCodeMirrorExtensions({ editor: this.editor }) ?? [];
    this._cmExtensions.push(...cmExtensions);
  }
}
