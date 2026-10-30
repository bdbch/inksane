import { escapeHtml } from "./escapeHtml.ts";
import type { FrontmatterData, FrontmatterValue } from "./frontmatter.ts";

/** Deepest nested value rendered before the rest is summarized. */
const MAX_DEPTH = 6;

const CHEVRON_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5 8 10l3.5-3.5"/></svg>`;
const EDIT_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 2.5l3 3M3 13l.5-3.5 7-7 3 3-7 7z"/></svg>`;

const plural = (count: number, singular: string) => `${count} ${singular}${count === 1 ? "" : "s"}`;

const isContainer = (value: FrontmatterValue): value is FrontmatterData =>
  typeof value === "object" && value !== null;

/** Formats a scalar YAML value for the table. */
function formatScalar(value: string | number | boolean | null): {
  text: string;
  modifiers: string;
} {
  if (value === null) return { text: "null", modifiers: " --null" };
  if (typeof value === "boolean") return { text: String(value), modifiers: " --boolean" };
  if (typeof value === "number") return { text: String(value), modifiers: " --number" };
  return { text: value, modifiers: "" };
}

function renderLeaf(key: string, text: string, modifiers = ""): string {
  return `<li class="inksane-frontmatter-item"><div class="inksane-frontmatter-row"><span class="inksane-frontmatter-grip" aria-hidden="true"></span><span class="inksane-frontmatter-key">${escapeHtml(key)}</span><span class="inksane-frontmatter-value${modifiers}">${escapeHtml(text)}</span></div></li>`;
}

function renderGroup(key: string, summary: string, children: string): string {
  const label = escapeHtml(key);
  return `<li class="inksane-frontmatter-item inksane-frontmatter-item--group"><div class="inksane-frontmatter-row"><button type="button" class="inksane-frontmatter-disclosure" data-frontmatter-group-toggle aria-expanded="false" aria-label="Expand ${label}">${CHEVRON_ICON}</button><span class="inksane-frontmatter-key">${label}</span><span class="inksane-frontmatter-summary">${escapeHtml(summary)}</span></div><ul class="inksane-frontmatter-children" hidden>${children}</ul></li>`;
}

/** Renders one key and its value, nesting maps and lists as collapsible groups. */
function renderEntry(
  key: string,
  value: FrontmatterValue,
  depth: number,
  ancestors: WeakSet<object>,
): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return renderLeaf(key, "[]", " --empty");
    if (depth >= MAX_DEPTH || ancestors.has(value)) return renderLeaf(key, "...", " --truncated");

    ancestors.add(value);
    const children = value
      .map((item, index) => renderEntry(String(index), item, depth + 1, ancestors))
      .join("");
    ancestors.delete(value);

    return renderGroup(key, plural(value.length, "item"), children);
  }

  if (isContainer(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return renderLeaf(key, "{}", " --empty");
    if (depth >= MAX_DEPTH || ancestors.has(value)) return renderLeaf(key, "...", " --truncated");

    ancestors.add(value);
    const children = entries
      .map(([childKey, childValue]) => renderEntry(childKey, childValue, depth + 1, ancestors))
      .join("");
    ancestors.delete(value);

    return renderGroup(key, plural(entries.length, "field"), children);
  }

  const { text, modifiers } = formatScalar(value);
  return renderLeaf(key, text, modifiers);
}

/**
 * Renders parsed frontmatter as an expandable properties table.
 *
 * The markup is trusted. Keys and values come from the document, so they are
 * escaped before they reach the HTML.
 *
 * @param data - Parsed frontmatter values.
 * @returns The table markup for an HTML widget.
 */
export function renderFrontmatterTable(data: FrontmatterData): string {
  const ancestors = new WeakSet<object>();
  const rows = Object.entries(data)
    .map(([key, value]) => renderEntry(key, value, 0, ancestors))
    .join("");
  const body = rows || `<li class="inksane-frontmatter-empty">No properties</li>`;

  return `<div class="inksane-frontmatter-panel" data-frontmatter-panel data-expanded="true"><div class="inksane-frontmatter-header"><button type="button" class="inksane-frontmatter-disclosure" data-frontmatter-panel-toggle aria-expanded="true" aria-label="Collapse properties">${CHEVRON_ICON}</button><span class="inksane-frontmatter-title">Properties</span><button type="button" class="inksane-frontmatter-edit" data-frontmatter-edit aria-label="Edit frontmatter" title="Edit frontmatter">${EDIT_ICON}</button></div><div class="inksane-frontmatter-body"><ul class="inksane-frontmatter-list">${body}</ul></div></div>`;
}

/**
 * Renders a short message for frontmatter that could not be parsed.
 *
 * @param message - The parser error.
 * @returns The message markup for an HTML widget.
 */
export function renderFrontmatterError(message: string): string {
  const summary = message.split("\n").find((line) => line.trim()) ?? message;
  return `<div class="inksane-frontmatter-panel inksane-frontmatter-panel--error" data-frontmatter-panel data-expanded="true"><div class="inksane-frontmatter-header"><span class="inksane-frontmatter-title">Properties</span><button type="button" class="inksane-frontmatter-edit" data-frontmatter-edit aria-label="Edit frontmatter" title="Edit frontmatter">${EDIT_ICON}</button></div><div class="inksane-frontmatter-body"><p class="inksane-frontmatter-error">${escapeHtml(summary)}</p></div></div>`;
}
