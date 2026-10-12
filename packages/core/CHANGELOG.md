# Changelog

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
