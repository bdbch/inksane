import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {
      tsgo: true,
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
