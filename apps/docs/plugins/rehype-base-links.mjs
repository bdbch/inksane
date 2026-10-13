/**
 * Rewrites root-relative links and image sources so they include the deployment base path.
 *
 * Astro applies `base` to assets and routes, but not to links written in Markdown, and MDX
 * components such as `<Card href="/...">` keep the path they were given. This runs over both the
 * Markdown elements and the MDX JSX attributes.
 *
 * @param {{ base?: string }} options
 * @returns {(tree: object) => void}
 */
export function rehypeBaseLinks({ base = "/" } = {}) {
  const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
  if (!prefix) return () => {};

  const rewrite = (value) =>
    value.startsWith("/") && !value.startsWith("//") ? prefix + value : value;

  const walk = (node) => {
    if (!node || typeof node !== "object") return;

    if (node.type === "element" && node.properties) {
      if (typeof node.properties.href === "string") {
        node.properties.href = rewrite(node.properties.href);
      }
      if (typeof node.properties.src === "string") {
        node.properties.src = rewrite(node.properties.src);
      }
    } else if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
      for (const attribute of node.attributes ?? []) {
        if (attribute?.type !== "mdxJsxAttribute") continue;
        if (attribute.name !== "href" && attribute.name !== "src") continue;
        if (typeof attribute.value === "string") {
          attribute.value = rewrite(attribute.value);
        }
      }
    }

    for (const child of node.children ?? []) walk(child);
  };

  return (tree) => walk(tree);
}
