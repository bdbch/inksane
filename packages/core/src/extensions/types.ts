import type { Editor } from "../editor/index.ts";
import type { Extension as CMExtension } from "@codemirror/state";
import type { EditorEvents } from "../editor/types.ts";
import type { KeyBinding } from "@codemirror/view";
import type { Command } from "../commands/types.ts";

export interface EditorContext {
  editor: Editor;
}

// TODO: define the types for the extensions
export type NodeConfig = {
  name: string;
};

// TODO: define the types for the extensions
export type MarkConfig = {
  name: string;
};

export type ExtensionEventHandlers = {
  [K in keyof EditorEvents]?: (ctx: EditorContext, payload: EditorEvents[K]) => void;
};

export type InkwellExtension = ExtensionEventHandlers & {
  name: string;

  /**
   * The extension priority. Extensions with higher priority will be initialized first. Defaults to 0.
   * @example 10
   */
  priority?: number;

  addNodes?: (ctx: EditorContext) => NodeConfig[];
  addMarks?: (ctx: EditorContext) => MarkConfig[];
  // Loose: core can't see InkwellCommands augmentations. Authors can annotate
  // returns as Partial<RawCommands> at the call site for per-command checking.
  // Command<any> (not unknown) because args is contravariant — specific command
  // types must be assignable to the registry type.
  addCommands?: (ctx: EditorContext) => Record<string, Command<any>>;
  addCodeMirrorExtensions?: (ctx: EditorContext) => CMExtension[];
  addExtensions?: (ctx: EditorContext) => InkwellExtension[];

  // TODO: define addKeybinds correctly
  addKeybinds?: (ctx: EditorContext) => readonly KeyBinding[] | undefined;
};
