---
"@inksane/core": minor
---

Feature extensions are now explicit. Import `BaseKit` from `@inksane/core/extensions/base-kit` and pass `BaseKit()` in the editor's `extensions` option to keep the standard setup. Individual features are available under `@inksane/core/extensions/*`.

Import `LinkExtension` from `@inksane/core/extensions/link` and `placeholderTheme` from `@inksane/core/extensions/placeholder`. Move the editor's `defaultKeymap` option into `BaseKit({ defaultKeymap: false })`. Document commands remain available without a kit.
