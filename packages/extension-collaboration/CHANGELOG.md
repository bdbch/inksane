# Changelog

## 0.2.1

<sub>2026-10-12</sub>

- _(patch)_
  Resolve `@inksane/core` from its published types during the package build so declaration generation no longer writes stray `.d.ts` files next to core's sources.

## 0.2.0

<sub>2026-10-12</sub>

- _(minor)_
  Add the `@inksane/extension-collaboration` package with a `CollaborationExtension` that syncs an editor through a shared Yjs document and renders remote cursors from awareness.
