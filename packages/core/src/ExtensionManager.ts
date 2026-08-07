import type { Extension as CMExtension } from "@codemirror/state";
import { type KeyBinding, keymap } from "@codemirror/view";
import type { Editor } from "~/Editor.ts";
import type { InkwellExtension } from "~/types/extensions.ts";
import type { CommandRegistry } from "~/CommandChain.ts";
import { resolveExtensionsOnEditor } from "~/helpers/resolveExtensionsOnEditor.ts";

/**
 * Manages and resolves extensions so the editor receives one complete CodeMirror setup.
 */
export class ExtensionManager {
  /** Keeps this manager connected to its editor. */
  private editor: Editor;

  /** Stores extensions passed directly to the editor. */
  private _extensions: InkwellExtension[] = [];

  /** Stores root and child extensions that can contribute to editor setup. */
  private _resolvedExtensions: InkwellExtension[] = [];

  /** Stores advanced CodeMirror additions from configured extensions. */
  private _addonCMExtensions: CMExtension[] = [];

  /** Stores keybindings before they become one CodeMirror keymap. */
  private _keybindings: CMExtension[] = [];

  /** Flat map of command name to curried impl, collected from extensions. */
  private _commands: CommandRegistry = {};

  /**
   * Creates one extension setup lifecycle for the editor and its configured extensions.
   *
   * @param editor - Owns this extension lifecycle.
   * @param extensions - Define the features available when the editor starts.
   */
  constructor(editor: Editor, extensions: InkwellExtension[]) {
    this.editor = editor;
    this._extensions = extensions;
    this._resolvedExtensions = this.resolveExtensions();

    const sortedExtensions = this.sortExtensionsByPrio(this._resolvedExtensions);
    for (const ext of sortedExtensions) {
      if (ext.addNodes) this.bindNodes(ext.addNodes);
      if (ext.addMarks) this.bindMarks(ext.addMarks);
      if (ext.addCommands) this.bindCommands(ext.addCommands);
      if (ext.addKeybinds) this.bindKeymaps(ext.addKeybinds);
      if (ext.addCodeMirrorExtensions) this.bindCmExtensions(ext.addCodeMirrorExtensions);
    }
  }

  /** Provides the root extensions before child extensions are resolved. */
  get extensions(): InkwellExtension[] {
    return [...this._extensions];
  }

  /** Provides CodeMirror extensions ready for the editor state. */
  get cmExtensions(): CMExtension[] {
    return [...this._keybindings, ...this._addonCMExtensions];
  }

  /** Provides root and child extensions that can contribute to editor setup. */
  get resolvedExtensions(): InkwellExtension[] {
    return [...this._resolvedExtensions];
  }

  /** Provides the collected command registry for editor.commands and chain(). */
  get commands(): CommandRegistry {
    return { ...this._commands };
  }

  /**
   * Expands child extensions so their contributions are included in editor setup.
   *
   * @returns The complete extension list, including child extensions.
   */
  resolveExtensions(): InkwellExtension[] {
    return resolveExtensionsOnEditor(this.editor, this._extensions);
  }

  /**
   * Orders extensions so higher-priority behavior takes precedence predictably.
   *
   * @param extensions - The extensions that need a predictable contribution order.
   * @returns A new array with higher-priority extensions first.
   */
  public sortExtensionsByPrio(extensions: InkwellExtension[]): InkwellExtension[] {
    return [...extensions].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Reserves the node registration step until Inkwell has a document model.
   *
   * @param addNodes - Provides nodes from one extension.
   */
  private bindNodes(addNodes: NonNullable<InkwellExtension["addNodes"]>) {
    // TODO: implement node binding logic, noop for now
  }

  /**
   * Reserves the mark registration step until Inkwell has a document model.
   *
   * @param addMarks - Provides marks from one extension.
   */
  private bindMarks(addMarks: NonNullable<InkwellExtension["addMarks"]>) {
    // TODO: implement mark binding logic, noop for now
  }

  /** Collects commands from one extension into the registry. */
  private bindCommands(addCommands: NonNullable<InkwellExtension["addCommands"]>) {
    const commands = addCommands({ editor: this.editor }) ?? {};
    Object.assign(this._commands, commands);
  }

  /**
   * Collects configured keybindings so they become one consistent editor keymap.
   *
   * @param addKeybinds - Provides keybindings from one extension.
   */
  private bindKeymaps(addKeybinds: NonNullable<InkwellExtension["addKeybinds"]>) {
    const keyBinds =
      addKeybinds({ editor: this.editor })?.filter((kb): kb is KeyBinding => kb !== undefined) ??
      [];
    this._keybindings.push(keymap.of(keyBinds));
  }

  /**
   * Keeps advanced CodeMirror additions in the same editor setup pipeline.
   *
   * @param addCodeMirrorExtensions - Provides CodeMirror additions from one extension.
   */
  private bindCmExtensions(
    addCodeMirrorExtensions: NonNullable<InkwellExtension["addCodeMirrorExtensions"]>,
  ) {
    const cmExtensions: CMExtension[] = addCodeMirrorExtensions({ editor: this.editor }) ?? [];
    this._addonCMExtensions.push(...cmExtensions);
  }
}
