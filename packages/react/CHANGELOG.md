# Changelog

## 0.2.0

<sub>2026-10-12</sub>

- _(minor)_
  Add the `@inksane/react` package with `useEditor`, `EditorProvider`, `EditorContent`, and `useCurrentEditor` for setting up an editor and reading it anywhere in a React tree.

  Core now allows creating an editor before its mount node exists. `element` is optional and `editor.mount(element)` attaches the editor later. New `mount`, `unmount`, and `destroy` events are emitted.
