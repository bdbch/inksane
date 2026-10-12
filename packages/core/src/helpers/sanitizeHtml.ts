import { isSafeUrl } from "./isSafeUrl.ts";

/** Elements that are rendered with their children. */
const ALLOWED_TAGS = new Set([
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "b",
  "blockquote",
  "br",
  "caption",
  "cite",
  "code",
  "dd",
  "del",
  "details",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "i",
  "img",
  "ins",
  "kbd",
  "li",
  "main",
  "mark",
  "nav",
  "ol",
  "p",
  "pre",
  "q",
  "s",
  "samp",
  "section",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "var",
]);

/** Elements that are dropped together with their children. */
const REMOVED_TAGS = new Set([
  "base",
  "button",
  "embed",
  "form",
  "iframe",
  "input",
  "link",
  "math",
  "meta",
  "noscript",
  "object",
  "option",
  "script",
  "select",
  "style",
  "svg",
  "template",
  "textarea",
  "title",
]);

const ALLOWED_ATTRIBUTES = new Set([
  "align",
  "alt",
  "cite",
  "class",
  "colspan",
  "datetime",
  "height",
  "href",
  "id",
  "open",
  "rel",
  "reversed",
  "role",
  "rowspan",
  "src",
  "start",
  "target",
  "title",
  "type",
  "width",
]);

const URL_ATTRIBUTES = new Set(["cite", "href", "src"]);

const ELEMENT_NODE = 1;
const COMMENT_NODE = 8;

function sanitizeAttributes(element: Element): void {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();

    if (name.startsWith("on") || name === "style" || name === "srcdoc") {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (name.startsWith("data-") || name.startsWith("aria-")) continue;

    if (!ALLOWED_ATTRIBUTES.has(name)) {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (URL_ATTRIBUTES.has(name) && !isSafeUrl(attribute.value.trim())) {
      element.removeAttribute(attribute.name);
    }
  }
}

function sanitizeChildren(parent: ParentNode): void {
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === COMMENT_NODE) {
      node.remove();
      continue;
    }

    if (node.nodeType !== ELEMENT_NODE) continue;

    const element = node as Element;
    const tag = element.tagName.toLowerCase();

    if (REMOVED_TAGS.has(tag)) {
      element.remove();
      continue;
    }

    sanitizeAttributes(element);
    sanitizeChildren(element);

    if (!ALLOWED_TAGS.has(tag)) {
      element.replaceWith(...Array.from(element.childNodes));
    }
  }
}

/**
 * Cleans an HTML string so it is safe to render inside the editor.
 *
 * Unknown elements are unwrapped, dangerous elements and attributes are
 * dropped, and URLs are checked with {@link isSafeUrl}. Use this for HTML that
 * comes from the document, which is not trusted.
 *
 * @param html - The HTML string from the document.
 * @returns The cleaned HTML string.
 */
export function sanitizeHtml(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  sanitizeChildren(template.content);
  return template.innerHTML;
}
