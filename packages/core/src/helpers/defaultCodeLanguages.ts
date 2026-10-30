import { LanguageDescription, LanguageSupport, StreamLanguage } from "@codemirror/language";

type LanguageParser = Parameters<typeof StreamLanguage.define>[0];

/**
 * Wraps a legacy mode in a language support.
 * Legacy modes declare a compatible parser type from a standalone package.
 */
const legacySupport = (parser: unknown) =>
  new LanguageSupport(StreamLanguage.define(parser as LanguageParser));

/**
 * Languages available to fenced code blocks by default.
 *
 * Most parsers load through a dynamic import the first time a fence uses
 * that language. Languages outside this list stay plain text until a caller
 * adds their description through `CodeExtension({ languages })`.
 *
 * HTML, CSS, and JavaScript are already part of the base Markdown language.
 * Markdown fences reuse the editor's Markdown parser, so those four stay in
 * the main bundle.
 */
export const defaultCodeLanguages: readonly LanguageDescription[] = [
  LanguageDescription.of({
    name: "JavaScript",
    alias: ["js", "jsx", "mjs", "cjs", "ecmascript", "node"],
    extensions: ["js", "jsx", "mjs", "cjs"],
    load: () =>
      import("@codemirror/lang-javascript").then((module) => module.javascript({ jsx: true })),
  }),
  LanguageDescription.of({
    name: "TypeScript",
    alias: ["ts", "typescript"],
    extensions: ["ts"],
    load: () =>
      import("@codemirror/lang-javascript").then((module) =>
        module.javascript({ typescript: true }),
      ),
  }),
  LanguageDescription.of({
    name: "TSX",
    alias: ["tsx"],
    extensions: ["tsx"],
    load: () =>
      import("@codemirror/lang-javascript").then((module) =>
        module.javascript({ jsx: true, typescript: true }),
      ),
  }),
  LanguageDescription.of({
    name: "HTML",
    alias: ["html", "htm", "xhtml"],
    extensions: ["html", "htm", "xhtml"],
    load: () => import("@codemirror/lang-html").then((module) => module.html()),
  }),
  LanguageDescription.of({
    name: "CSS",
    alias: ["css"],
    extensions: ["css"],
    load: () => import("@codemirror/lang-css").then((module) => module.css()),
  }),
  LanguageDescription.of({
    name: "JSON",
    alias: ["json"],
    extensions: ["json"],
    load: () => import("@codemirror/lang-json").then((module) => module.json()),
  }),
  LanguageDescription.of({
    name: "YAML",
    alias: ["yaml", "yml"],
    extensions: ["yaml", "yml"],
    load: () => import("@codemirror/lang-yaml").then((module) => module.yaml()),
  }),
  LanguageDescription.of({
    name: "TOML",
    alias: ["toml"],
    extensions: ["toml"],
    load: () =>
      import("@codemirror/legacy-modes/mode/toml").then((module) => legacySupport(module.toml)),
  }),
  LanguageDescription.of({
    name: "Shell",
    alias: ["sh", "bash", "zsh", "shell", "ksh"],
    extensions: ["sh", "bash", "zsh", "ksh"],
    load: () =>
      import("@codemirror/legacy-modes/mode/shell").then((module) => legacySupport(module.shell)),
  }),
  LanguageDescription.of({
    name: "Python",
    alias: ["py", "python"],
    extensions: ["py", "pyw"],
    load: () => import("@codemirror/lang-python").then((module) => module.python()),
  }),
  LanguageDescription.of({
    name: "SQL",
    alias: ["sql"],
    extensions: ["sql"],
    load: () => import("@codemirror/lang-sql").then((module) => module.sql()),
  }),
  LanguageDescription.of({
    name: "XML",
    alias: ["xml", "xsl", "xsd", "svg", "rss", "wsdl"],
    extensions: ["xml", "xsl", "xsd", "svg"],
    load: () => import("@codemirror/lang-xml").then((module) => module.xml()),
  }),
  LanguageDescription.of({
    name: "Go",
    alias: ["go", "golang"],
    extensions: ["go"],
    load: () => import("@codemirror/lang-go").then((module) => module.go()),
  }),
  LanguageDescription.of({
    name: "Rust",
    alias: ["rust", "rs"],
    extensions: ["rs"],
    load: () => import("@codemirror/lang-rust").then((module) => module.rust()),
  }),
  LanguageDescription.of({
    name: "Java",
    alias: ["java"],
    extensions: ["java"],
    load: () => import("@codemirror/lang-java").then((module) => module.java()),
  }),
  LanguageDescription.of({
    name: "C/C++",
    alias: ["c", "cpp", "c++", "cc", "cxx", "h", "hpp", "hh", "hxx", "ino"],
    extensions: ["c", "cpp", "cc", "cxx", "h", "hpp", "hh", "hxx", "ino"],
    load: () => import("@codemirror/lang-cpp").then((module) => module.cpp()),
  }),
  LanguageDescription.of({
    name: "PHP",
    alias: ["php"],
    extensions: ["php"],
    load: () => import("@codemirror/lang-php").then((module) => module.php()),
  }),
  LanguageDescription.of({
    name: "Diff",
    alias: ["diff", "patch"],
    extensions: ["diff", "patch"],
    load: () =>
      import("@codemirror/legacy-modes/mode/diff").then((module) => legacySupport(module.diff)),
  }),
  LanguageDescription.of({
    name: "Dockerfile",
    alias: ["dockerfile", "docker"],
    load: () =>
      import("@codemirror/legacy-modes/mode/dockerfile").then((module) =>
        legacySupport(module.dockerFile),
      ),
  }),
  LanguageDescription.of({
    name: "Markdown",
    alias: ["md", "markdown"],
    extensions: ["md", "markdown"],
    load: () => import("@codemirror/lang-markdown").then((module) => module.markdown()),
  }),
];
