const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes a string so it can be embedded in HTML as text.
 *
 * Use this for any document text you interpolate into markup passed to
 * {@link htmlWidget}. The markup itself is trusted, the document is not.
 *
 * @param value - The text to escape.
 * @returns The escaped text.
 *
 * @example
 * ```ts
 * escapeHtml("<script>"); // "&lt;script&gt;"
 * ```
 */
export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
