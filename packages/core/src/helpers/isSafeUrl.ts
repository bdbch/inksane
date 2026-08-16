/**
 * Checks whether a URL is safe to use by validating its protocol.
 *
 * A URL is considered safe if it uses one of the following schemes:
 * - `http:` — standard HTTP
 * - `https:` — secure HTTP
 * - `mailto:` — email links
 *
 * Relative URLs (no scheme) are also considered safe.
 *
 * @param url - The URL string to validate.
 * @returns `true` if the URL is safe, `false` otherwise.
 *
 * @example
 * ```ts
 * isSafeUrl("https://example.com"); // true
 * isSafeUrl("javascript:alert(1)"); // false
 * isSafeUrl("/relative/path"); // true
 * ```
 */
export const isSafeUrl = (url: string): boolean => {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" || protocol === "mailto:";
  } catch {
    return !/^[a-z][a-z\d+.-]*:/i.test(url);
  }
};
