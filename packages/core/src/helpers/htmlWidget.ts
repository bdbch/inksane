import { WidgetType } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";

/** Options for {@link htmlWidget}. */
export type HtmlWidgetOptions = {
  /** Renders the markup as a block element. Defaults to false, which is inline. */
  block?: boolean;
  /** Extra class name added next to `inksane-html`. */
  className?: string;
  /** Estimated rendered height in pixels, used for off-screen layout. */
  estimatedHeight?: number;
  /**
   * Runs after the markup is rendered. Use it to attach listeners or tweak the
   * element. The wrapper element is passed, not the elements inside the markup.
   */
  onRender?: (element: HTMLElement, view: EditorView) => void;
};

/** Resolved options with defaults applied, so `eq` can compare flat values. */
type ResolvedOptions = Required<Omit<HtmlWidgetOptions, "onRender">> & {
  onRender?: (element: HTMLElement, view: EditorView) => void;
};

/**
 * Renders an HTML string. The markup is authored by the extension, so it is
 * treated as trusted and inserted as-is.
 */
class HtmlWidget extends WidgetType {
  private html: string;
  private options: ResolvedOptions;

  constructor(html: string, options: HtmlWidgetOptions) {
    super();
    this.html = html;
    this.options = {
      block: options.block ?? false,
      className: options.className ?? "",
      estimatedHeight: options.estimatedHeight ?? -1,
      onRender: options.onRender,
    };
  }

  toDOM(view: EditorView) {
    const element = view.dom.ownerDocument.createElement(this.options.block ? "div" : "span");
    element.className = ["inksane-html", this.options.className].filter(Boolean).join(" ");
    // CodeMirror measures the border box only. A flow root keeps child
    // margins inside the box, so they count toward the measured height.
    if (this.options.block) element.style.display = "flow-root";
    element.innerHTML = this.html;
    this.options.onRender?.(element, view);
    return element;
  }

  eq(other: WidgetType) {
    return (
      other instanceof HtmlWidget &&
      other.html === this.html &&
      other.options.block === this.options.block &&
      other.options.className === this.options.className &&
      other.options.estimatedHeight === this.options.estimatedHeight
    );
  }

  get estimatedHeight() {
    return this.options.estimatedHeight;
  }

  ignoreEvent() {
    return true;
  }
}

/**
 * Creates a widget that renders extension-authored HTML inside the editor.
 *
 * The editor owns the rendering, so extensions return a string instead of
 * building DOM. Use it wherever a markdown decoration accepts a widget type.
 *
 * The markup is trusted because it comes from the extension, not the document.
 * Escape document text you interpolate with {@link escapeHtml}, and validate
 * URLs before putting them into attributes.
 *
 * @param html - The HTML markup to render.
 * @param options - Block display, class name, height, and a render hook.
 * @returns A CodeMirror widget for a decoration `type`.
 *
 * @example
 * ```ts
 * addMarkdownDecorations() {
 *   return [
 *     {
 *       nodeName: "Callout",
 *       hideSyntax: true,
 *       markup: (node) => [{ from: node.from, to: node.to }],
 *       widgets: [
 *         {
 *           kind: "replace",
 *           block: true,
 *           type: (node, state) =>
 *             htmlWidget(`<div class="callout">${escapeHtml(state.sliceDoc(node.from, node.to))}</div>`, {
 *               block: true,
 *             }),
 *         },
 *       ],
 *     },
 *   ];
 * }
 * ```
 */
export function htmlWidget(html: string, options: HtmlWidgetOptions = {}): WidgetType {
  return new HtmlWidget(html, options);
}
