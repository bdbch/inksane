import type { Extension as CMExtension } from "@codemirror/state";
import type { KeyBinding } from "@codemirror/view";
import type { Editor } from "../Editor.ts";
import type { EditorEvents } from "./editor.ts";
import type { Command } from "./commands.ts";

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
  addCommands?: (ctx: EditorContext) => Record<string, Command<any>>;
  addCodeMirrorExtensions?: (ctx: EditorContext) => CMExtension[];
  addExtensions?: (ctx: EditorContext) => InkwellExtension[];

  // TODO: define addKeybinds correctly
  addKeybinds?: (ctx: EditorContext) => readonly KeyBinding[] | undefined;
};
