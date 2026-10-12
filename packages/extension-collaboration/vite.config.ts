import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {
      tsgo: true,
      // The build must not resolve core from source. Doing so emits .d.ts files
      // next to core's sources, which leaves the tree dirty and blocks publish.
      tsconfig: "./tsconfig.build.json",
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
  test: {
    environment: "jsdom",
    // Tests import core from source. Core ships only `dist`, which is not built
    // when tests run.
    alias: {
      "@inksane/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
    },
  },
});
