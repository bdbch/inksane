---
"@inksane/core": minor
"@inksane/playground": none
---

Added a `LinkExtension` factory with an `onLinkRequest` option. `Mod-K` asks it for a URL before creating a link, removes an existing link, and stays unbound when no handler is set.

An extension passed to the editor now replaces a built-in with the same name, so `LinkExtension` can be configured through the `extensions` option. `LinkExtension` is exported from the package.
