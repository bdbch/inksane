import type { Extension as CMExtension } from "@codemirror/state";
import type { KeyBinding } from "@codemirror/view";
import type { MarkdownExtension } from "@lezer/markdown";
import type { Editor } from "../Editor.ts";
import type { EditorEvents } from "./editor.ts";
import type { RawCommands } from "./commands.ts";

export interface EditorContext {
  editor: Editor;
}

/** Applies a CSS class to every syntax-tree node with the given name. */
export type MarkdownDecorationConfig = {
  nodeName: string;
  className: string;
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

  addMarkdownSyntax?: (ctx: EditorContext) => MarkdownExtension[];
  addMarkdownDecorations?: (ctx: EditorContext) => MarkdownDecorationConfig[];
  addCommands?: (ctx: EditorContext) => Partial<RawCommands>;
  addCodeMirrorExtensions?: (ctx: EditorContext) => CMExtension[];
  addExtensions?: (ctx: EditorContext) => InkwellExtension[];

  // TODO: define addKeybinds correctly
  addKeybinds?: (ctx: EditorContext) => readonly KeyBinding[] | undefined;
};
