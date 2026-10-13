# Editor state

Toolbars, bubble menus, and command palettes need to know what the editor is doing at the current selection. The editor exposes three queries for that.

## Check what is active

`editor.isActive(name, attrs?)` returns `true` when a mark or block node is active at the current selection.

```js
editor.isActive("bold");
editor.isActive("link", { href: "https://example.com" });
editor.isActive("heading", { level: 1 });
```

A collapsed selection only counts inside an inline mark, so a caret just after `**bold**` is not bold. A block node, such as a heading, list, code block, or blockquote, counts when the selection sits on its line or inside it.

The built-in names are `bold`, `italic`, `code`, `link`, `heading`, `bulletList`, `orderedList`, `codeBlock`, `blockquote`, and `horizontalRule`. Extensions add their own names through the `addStateQueries` hook.

## Find the range of a mark

`editor.getMarkRange(name?)` returns the range of the active mark around the selection, or `null` when there is none. Without a name it returns the innermost mark.

```js
const range = editor.getMarkRange("bold");

if (range) {
  console.log(range.from, range.to);
}
```

## Check whether a command would run

`editor.canRun(command, ...args)` returns the same boolean as running the command, without changing the editor. Use it to enable or disable a toolbar button.

```js
const canBold = editor.canRun("toggleBold");
const canHeading = editor.canRun("setHeading", { level: 1 });
```

The command runs against a projected copy of the current state, so nothing is dispatched.
