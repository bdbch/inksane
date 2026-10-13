// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { unified } from "@astrojs/markdown-remark";
import tailwindcss from "@tailwindcss/vite";
import { rehypeCode, remarkHeading, remarkStructure } from "fumadocs-core/mdx-plugins";
import { rehypeBaseLinks } from "./plugins/rehype-base-links.mjs";

// The docs deploy under a subpath of the Pages site, so the base path comes from the environment.
// It is `/` for local development and every other build.
const base = process.env.DOCS_BASE_PATH ?? "/";

/** @type {import("@astrojs/markdown-remark").RemarkPlugins} */
const remarkPlugins = [remarkHeading, [remarkStructure, { exportAs: "structuredData" }]];
/** @type {import("@astrojs/markdown-remark").RehypePlugins} */
const rehypePlugins = [rehypeCode, [rehypeBaseLinks, { base }]];

// https://astro.build/config
export default defineConfig({
  base,
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
