// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { unified } from "@astrojs/markdown-remark";
import tailwindcss from "@tailwindcss/vite";
import { rehypeCode, remarkHeading, remarkStructure } from "fumadocs-core/mdx-plugins";

/** @type {import("@astrojs/markdown-remark").RemarkPlugins} */
const remarkPlugins = [remarkHeading, [remarkStructure, { exportAs: "structuredData" }]];
/** @type {import("@astrojs/markdown-remark").RehypePlugins} */
const rehypePlugins = [rehypeCode];

// https://astro.build/config
export default defineConfig({
  // The docs have no page at the site root, so send visitors into the docs.
  redirects: {
    "/": "/introduction",
  },
  markdown: {
    syntaxHighlight: false,
    processor: unified({
      remarkPlugins,
      rehypePlugins,
    }),
  },
  integrations: [
    react(),
    mdx({
      extendMarkdownConfig: true,
      syntaxHighlight: false,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
