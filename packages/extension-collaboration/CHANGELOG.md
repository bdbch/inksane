# Changelog

## 0.2.2

<sub>2026-10-14</sub>

- _(patch)_
  Added the `editable` option and `editor.setEditable()` to control read-only mode. Read-only editors keep rendering, selection, and scrolling while a transaction filter blocks local edits. Commands and `canRun()` return false while read-only. Programmatic content setters and remote collaboration updates still work.

## 0.2.1

<sub>2026-10-12</sub>

- _(patch)_
  Resolve `@inksane/core` from its published types during the package build so declaration generation no longer writes stray `.d.ts` files next to core's sources.

## 0.2.0

<sub>2026-10-12</sub>

- _(minor)_
  Add the `@inksane/extension-collaboration` package with a `CollaborationExtension` that syncs an editor through a shared Yjs document and renders remote cursors from awareness.
