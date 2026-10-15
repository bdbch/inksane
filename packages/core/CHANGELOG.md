# Changelog

## 1.0.0

<sub>2026-10-15</sub>

- _(major)_
  Removed the deprecated `editor.json` accessor. Use `editor.getMarkdown()` to read the document, or `editor.textJSON` for the raw CodeMirror line array.
- _(minor)_
  Added the task list extension with GFM task item parsing, interactive checkbox widgets, HTML paste support for checkboxes in list items, and the setTaskList, removeTaskList, and toggleTaskList commands. BaseKit includes it by default and accepts taskList: false to disable it.
- _(minor)_
  Added the footnotes extension. It parses footnote references (`[^1]`) and definitions (`[^1]: note`), renders references as superscript markers, renders definitions as a distinct block with an identifier, and lets a reference click jump to its definition. It also converts pasted footnote HTML and is included in BaseKit. Pass `footnotes: false` to BaseKit to disable it.
- _(minor)_
  Added the `image` and `htmlBlock` state queries, so `editor.isActive("image")` and `editor.isActive("htmlBlock")` report the selection position.
- _(minor)_
  Added `editor.setOptions()` to update `content`, `editable`, `theme`, `lineWrapping`, and `tabSize` after creation. The `tabSize` option now applies to later indentations instead of only to the initial keymap.
- _(minor)_
  Aligned command names with the mark and block rules.

  Marks now use `setBold`, `setItalic`, `setCode`, `setLink`, and `setStrikethrough`. The removed `insertBold`, `insertItalic`, `insertCode`, and `insertLink` behavior is an optional `content` option on those `set` commands. Strikethrough uses the full name, so `setStrike` is now `setStrikethrough`, and `removeStrike` and `toggleStrike` follow.

  Block features use the `insert` verb: `insertHeading`, `insertBlockquote`, `insertCodeBlock`, and `insertTaskList` replace `setHeading`, `setBlockquote`, `setCodeBlock`, and `setTaskList`.

- _(minor)_
  Exported more helpers from the package root: `isSafeUrl` and `htmlToMarkdown` for HTML handling, and `markRangesWithWhitespace` for writing Markdown decorations.
- _(patch)_
  Fixed `cutContent` so it moves content to the correct range instead of throwing. Made `cutContent` and `deleteContent` chainable by returning the chain type like the other commands. Allowed the `focus` command to run in read-only editors.
- _(patch)_
  `editor.canRun(name)` now returns `false` when the editor is not mounted, matching the fact that commands need the mounted view.
- _(patch)_
  Extensions that register an already registered command name now log a warning. The higher-priority extension keeps its command, and the colliding command from the lower-priority extension is skipped.
- _(patch)_
  Extensions with a duplicate name are now deduplicated instead of throwing. The first registered extension with a given name wins.
- _(patch)_ The placeholder no longer sets a default text color. Style it with CSS or with `placeholderTheme({ color })`.
- _(patch)_
  Calling a command that is not registered, such as `editor.commands.unknown()`, now throws the same `Command "unknown" is not registered.` error as `editor.canRun` and `editor.chain()`.

## 0.7.0

<sub>2026-10-14</sub>

- _(minor)_
  Added the `editable` option and `editor.setEditable()` to control read-only mode. Read-only editors keep rendering, selection, and scrolling while a transaction filter blocks local edits. Commands and `canRun()` return false while read-only. Programmatic content setters and remote collaboration updates still work.
- _(minor)_ Added `focus` and `blur` events with an `{ editor }` payload. Listeners receive the updated `editor.focused` state.
- _(minor)_
  Feature extensions are now explicit. Import `BaseKit` from `@inksane/core/extensions/base-kit` and pass `BaseKit()` in the editor's `extensions` option to keep the standard setup. Individual features are available under `@inksane/core/extensions/*`.

  Import `LinkExtension` from `@inksane/core/extensions/link` and `placeholderTheme` from `@inksane/core/extensions/placeholder`. Move the editor's `defaultKeymap` option into `BaseKit({ defaultKeymap: false })`. Document commands remain available without a kit.

- _(minor)_
  Added the strikethrough extension with GFM syntax, HTML paste support, setStrike, removeStrike, toggleStrike, and the Mod-Shift-x shortcut. BaseKit includes it by default and accepts strikethrough: false to disable it.
- _(patch)_
  Fixed editor destruction to release DOM references, pending state, and event listeners. Repeated destruction is safe. Destroyed editors cannot mount again, but a new editor can reuse the same element.
- _(patch)_ Fixed `beforeTransaction` and `transaction` events to fire for each transaction dispatched to the mounted editor view.
- _(patch)_
  Fixed extension event handlers so root and child extensions receive editor events in priority order. Handlers are removed when the editor is destroyed.

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
