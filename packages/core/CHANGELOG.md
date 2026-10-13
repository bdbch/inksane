# Changelog

## 0.6.0

<sub>2026-10-13</sub>

- _(minor)_
  Added a `LinkExtension` factory with an `onLinkRequest` option. `Mod-K` asks it for a URL before creating a link, removes an existing link, and stays unbound when no handler is set.

  An extension passed to the editor now replaces a built-in with the same name, so `LinkExtension` can be configured through the `extensions` option. `LinkExtension` is exported from the package.

- _(minor)_
  Added `getMarkdown()` and `setMarkdown()` as the primary document serialization API, plus `textJSON` for CodeMirror's raw line array. Deprecated the `json` getter and setter, which returned that line array under a misleading name. They now alias `textJSON` and will be removed in a future major release.
- _(minor)_
  Registered a default editing keymap with the standard keys for word and line deletion, Home/End and line selection, and Find and Replace. The keymap can be opted out of with the new `defaultKeymap` option, or replaced by configuring an extension named `defaultKeymap`.
- _(minor)_
  Added selection state queries to the editor. `isActive(name, attrs?)` reports whether a mark or block node is active at the current selection, `getMarkRange(name?)` returns the range of the active mark, and `canRun(command, ...args)` reports whether a command would succeed without running it.

  Extensions declare their query names and syntax nodes through the new `addStateQueries` hook.

- _(minor)_
  Added a `placeholder` option. The text shows while the document is empty and
  hides once there is content. Adjust its styles with the exported
  `placeholderTheme` function.
- _(patch)_ Keep unfinished image syntax from rendering a broken image
- _(patch)_
  Only show the open-link icon for links that have a real, safe URL. Footnote
  references, task checkboxes, and wiki links are parsed as links even though they
  have no URL, which previously rendered a broken open-link control pointing at an
  empty `href`. These links now render without the icon.
- _(patch)_
  Wire up undo and redo. The editor now registers CodeMirror's history extension and history keybindings by default, so Mod-Z undoes and Mod-Shift-Z / Mod-Y redo for both typing and command-based edits.
- _(patch)_
  `insertLink` and `setLink` now reject empty and unsafe URLs such as
  `javascript:` and `data:`, matching the validation already applied by
  `insertImage`. Unsafe URLs return `false` and leave the document unchanged.

  The New Issue playground example now inserts a safe placeholder URL so its
  Link toolbar button keeps working.

- _(patch)_ Enter now always inserts a newline instead of the Markdown keymap adding a list or quote marker.

## 0.5.0

<sub>2026-10-12</sub>

- _(minor)_
  Add the `@inksane/react` package with `useEditor`, `EditorProvider`, `EditorContent`, and `useCurrentEditor` for setting up an editor and reading it anywhere in a React tree.

  Core now allows creating an editor before its mount node exists. `element` is optional and `editor.mount(element)` attaches the editor later. New `mount`, `unmount`, and `destroy` events are emitted.

## 0.4.0

<sub>2026-10-12</sub>

- _(minor)_
  Add HTML paste support that converts pasted HTML into Markdown. Extensions teach the editor how their own HTML becomes Markdown through the new `addHtmlConverters` hook.
- _(patch)_ Fixed a bug where an unfocused editor still showed replacement decorations for Markdown syntax.

## 0.3.0

<sub>2026-10-12</sub>

- _(minor)_ Add an HTML extension that renders block-level HTML from the document
- _(patch)_ Add URL safety validation for image URLs

## 0.2.0

<sub>2026-08-15</sub>

- _(minor)_ Add block-level attachment widgets between editor lines.
- _(patch)_ Show image widgets below active Markdown syntax and inline otherwise.

## 0.1.1

<sub>2026-08-15</sub>

- _(patch)_
  Added a new `lineWrapping` wrapping option to the Editor options that controls if content should wrap - defaults to `true`.

## 0.1.0

<sub>2026-08-15</sub>

- _(minor)_ Initial release of inksane
