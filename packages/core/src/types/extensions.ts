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

/** A widget that replaces the hidden markup of a node. */
export type ReplacementWidget = {
  kind: "replace";
  /** The widget to render in place of the markup. */
  type: WidgetType | ((node: SyntaxNode, state: EditorState) => WidgetType);
  /** Renders it as a block-level widget spanning the line. */
  block?: boolean;
};

/** A widget attached to a position on a node. */
export type AttachmentWidget = {
  kind: "attach";
  /** Where the widget is attached. Defaults to "after". */
  position?: "before" | "after" | ((node: SyntaxNode, state: EditorState) => number);
  /** Renders it as a block-level widget between lines. */
  block?: boolean;
  /** Only renders while the syntax is hidden. Defaults to true. */
  onlyWhenHidden?: boolean;
  /** Only renders while the syntax is visible. Defaults to false. */
  onlyWhenVisible?: boolean;
  /** The widget to render. A factory can build it per node. */
  type: WidgetType | ((node: SyntaxNode, state: EditorState) => WidgetType);
};

/** A widget rendered for a decorated node. */
export type MarkdownNodeWidget = ReplacementWidget | AttachmentWidget;

/** Declares how a syntax-tree node is decorated. */
export type MarkdownDecorationConfig = {
  /** The syntax-tree node name this config applies to. */
  nodeName: string;
  /** The CSS class applied to the node. */
  className?: string;
  /** The CSS class applied to every line within the node. */
  lineClass?: string;
  /**
   * Which parts of the node count as markdown markup.
   * Defaults to the node's direct `*Mark` children.
   * Can be a list of node names or a function returning ranges.
   */
  markup?: string[] | ((node: SyntaxNode, state: EditorState) => MarkupRange[]);
  /** Hides the markup while the cursor is outside the node. */
  hideSyntax?: boolean;
  /** Widgets rendered for the node. */
  widgets?: MarkdownNodeWidget[];
};

export type ExtensionEventHandlers = {
  [K in keyof EditorEvents]?: (ctx: EditorContext, payload: EditorEvents[K]) => void;
};

export type Extension = ExtensionEventHandlers & {
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
  addExtensions?: (ctx: EditorContext) => Extension[];

  // TODO: define addKeybinds correctly
  addKeybinds?: (ctx: EditorContext) => readonly KeyBinding[] | undefined;
};
