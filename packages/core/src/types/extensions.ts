import type { Extension as CMExtension, EditorState } from "@codemirror/state";
import type { KeyBinding, WidgetType } from "@codemirror/view";
import type { MarkdownExtension } from "@lezer/markdown";
import type { SyntaxNode } from "@lezer/common";
import type { Editor } from "../Editor.ts";
import type { EditorEvents } from "./editor.ts";
import type { RawCommands } from "./commands.ts";

export interface EditorContext {
  editor: Editor;
}

/** Represents a range inside a syntax-tree node. */
export type MarkupRange = {
  from: number;
  to: number;
};

/** Declares how a syntax-tree node is decorated. */
export type MarkdownDecorationConfig = {
  /** The syntax-tree node name this config applies to. */
  nodeName: string;
  /** The CSS class applied to the node. */
  className: string;
  /**
   * Which parts of the node count as markdown markup.
   * Defaults to the node's direct `*Mark` children.
   * Can be a list of node names or a function returning ranges.
   */
  markup?: string[] | ((node: SyntaxNode, state: EditorState) => MarkupRange[]);
  /** Hides the markup while the cursor is outside the node. */
  hideSyntax?: boolean;
  /**
   * Widget rendered in place of the markup while `hideSyntax` hides it.
   * `block` renders it as a block-level widget spanning the line.
   */
  widget?: { type: WidgetType; block?: boolean };
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
