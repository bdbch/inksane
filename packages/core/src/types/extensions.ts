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
  /**
   * The widget to render in place of the markup. A factory can return `null`
   * to leave the markup undeclared, which keeps the source text visible.
   */
  type: WidgetType | ((node: SyntaxNode, state: EditorState) => WidgetType | null);
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
  /**
   * The widget to render. A factory can build it per node, or return `null`
   * to render nothing.
   */
  type: WidgetType | ((node: SyntaxNode, state: EditorState) => WidgetType | null);
};

/** A widget rendered for a decorated node. */
export type MarkdownNodeWidget = ReplacementWidget | AttachmentWidget;

/** Context passed to an {@link HtmlConverter} while it serializes an element. */
export type HtmlConverterContext = {
  /** Converts an element's children to Markdown, applying the converters again. */
  renderChildren: (element: Element) => string;
};

/** Converts one kind of HTML element into Markdown for an extension. */
export type HtmlConverter = {
  /** Returns true when this converter should handle the element. */
  match: (element: Element) => boolean;
  /** Serializes the matched element to Markdown. */
  toMarkdown: (element: Element, context: HtmlConverterContext) => string;
  /** Renders the element as a block, adding blank lines around it. Defaults to false. */
  block?: boolean;
};

/**
 * Declares how a logical name resolves against the Markdown syntax tree for
 * state queries, so `editor.isActive`, `editor.getMarkRange`, and toolbars can
 * ask whether a mark or node is active at the current selection.
 */
export type StateQueryConfig = {
  /** The logical name used by `editor.isActive(name)`, e.g. "bold" or "heading". */
  name: string;
  /** The Lezer syntax node names that make this query active. */
  nodeNames: string[];
  /**
   * Whether the query covers an inline mark or a block node. A collapsed
   * selection must sit inside a mark, but may sit on the edge of a node.
   * Defaults to "mark".
   */
  kind?: "mark" | "node";
  /**
   * Reads the query's attributes from a matched node, such as a heading level
   * or a link href. `editor.isActive(name, attrs)` matches them as a subset.
   */
  attrs?: (node: SyntaxNode, state: EditorState) => Record<string, unknown>;
};

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
  /**
   * Hides the markup while the selection is outside the node. During a drag,
   * a node the selection touches stays revealed until the pointer is released.
   */
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
  addStateQueries?: (ctx: EditorContext) => StateQueryConfig[];
  addHtmlConverters?: (ctx: EditorContext) => HtmlConverter[];
  addCommands?: (ctx: EditorContext) => Partial<RawCommands>;
  addCodeMirrorExtensions?: (ctx: EditorContext) => CMExtension[];
  addExtensions?: (ctx: EditorContext) => Extension[];

  // TODO: define addKeybinds correctly
  addKeybinds?: (ctx: EditorContext) => readonly KeyBinding[] | undefined;
};
