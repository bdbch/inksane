import type { HtmlConverter } from "../types/index.ts";
import { sanitizeHtml } from "./sanitizeHtml.ts";

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/**
 * Block elements the editor treats as structure when no converter claims them.
 * Syntax-bearing blocks like headings and lists are owned by their extension.
 */
const STRUCTURAL_BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "header",
  "li",
  "main",
  "nav",
  "p",
  "section",
  "summary",
]);

/** Collapses runs of whitespace the way browsers render HTML text. */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ");
}

/** Escapes markdown control characters so text stays literal. */
function escapeText(text: string): string {
  return collapseWhitespace(text)
    .replace(/\\/g, "\\\\")
    .replace(/([*_[\]`])/g, "\\$1");
}

/** Escapes a leading marker so pasted text does not become a new block. */
function escapeBlockStart(text: string): string {
  const match = /^(\s*)([#>]|[-+*](?=\s)|\d+[.)](?=\s))/.exec(text);
  if (!match) return text;
  return `${match[1]}\\${match[2]}${text.slice(match[0].length)}`;
}

/**
 * Builds the renderer that walks a parsed document. Structure stays here,
 * syntax comes from the converters, so only registered extensions contribute.
 */
function createRenderer(converters: HtmlConverter[]): (parent: Node) => string {
  const findConverter = (element: Element): HtmlConverter | undefined =>
    converters.find((converter) => converter.match(element));

  const isBlock = (element: Element, converter?: HtmlConverter): boolean =>
    converter ? converter.block === true : STRUCTURAL_BLOCK_TAGS.has(element.tagName.toLowerCase());

  function renderElement(element: Element): string {
    const converter = findConverter(element);
    if (converter) return converter.toMarkdown(element, { renderChildren });

    if (element.tagName.toLowerCase() === "br") return "\\\n";

    return renderChildren(element);
  }

  function renderChildren(parent: Node): string {
    let out = "";

    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === TEXT_NODE) {
        let text = escapeText(child.nodeValue ?? "");
        if (!out.trim()) text = escapeBlockStart(text);
        if (out.endsWith(" ") && text.startsWith(" ")) text = text.slice(1);
        out += text;
        continue;
      }

      if (child.nodeType !== ELEMENT_NODE) continue;

      const element = child as Element;
      const converter = findConverter(element);

      if (isBlock(element, converter)) {
        const block = renderElement(element).replace(/\n+$/, "");
        if (!block) continue;
        out = out.trim() ? `${out.replace(/\s+$/, "")}\n\n${block}\n\n` : `${block}\n\n`;
        continue;
      }

      out += renderElement(element);
    }

    return out;
  }

  return renderChildren;
}

/**
 * Converts an HTML string into Markdown.
 *
 * The input is not trusted, so it is cleaned with {@link sanitizeHtml} first.
 * Structure such as paragraphs, spacing, and escaping is handled here. Syntax,
 * such as bold, links, or lists, comes from the converters the extensions
 * register with `addHtmlConverters`. Elements no converter claims keep their
 * text, so no Markdown is produced for a syntax that is not loaded.
 *
 * @param html - The HTML string to convert.
 * @param converters - The converters collected from the active extensions.
 * @returns The Markdown equivalent, or an empty string when there is none.
 *
 * @example
 * ```ts
 * htmlToMarkdown("<h1>Hi</h1>", headingConverters); // "# Hi"
 * ```
 */
export function htmlToMarkdown(html: string, converters: HtmlConverter[] = []): string {
  const template = document.createElement("template");
  template.innerHTML = sanitizeHtml(html);

  const render = createRenderer(converters);

  return render(template.content)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
