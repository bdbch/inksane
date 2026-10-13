/**
 * The deployment base path, always with a trailing slash.
 *
 * Astro normalizes `base` to a value without a trailing slash (`/inksane/docs`), while asset and
 * route URLs need one (`/inksane/docs/`). Everything that builds a URL by concatenation uses this.
 */
export const basePath = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
