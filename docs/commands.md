# Commands

Commands change editor content or editor state. The built-in commands and commands added by extensions are available on every editor instance.

Every command returns a boolean. `true` means the command ran successfully; `false` means it could not be applied. This is useful when a command depends on the current selection or document content.

## Run a command directly

Use `editor.commands` when you need to run one command immediately.

```js
const inserted = editor.commands.insertContent({
  content: "Hello, inksane!",
  from: 0,
});

if (!inserted) {
  console.error("Could not insert content");
}
```

Commands that work with the current selection, such as `toggleBold`, can be called without a position:

```js
editor.commands.toggleBold();
editor.commands.focus();
```

Pass a `pos` option when you want a formatting command to use a specific position or range instead of the current selection:

```js
editor.commands.setBold({ pos: { from: 0, to: 5 } });
```

## Chain commands

Use `editor.chain()` to collect multiple commands and execute them with `.run()`.

```js
const applied = editor
  .chain()
  .insertContent({ content: "Hello", from: 0 })
  .insertContent({ content: " world", from: 5 })
  .run();
```

Nothing changes until `.run()` is called. At that point, inksane evaluates the chain against the editor's current state and dispatches its changes together. Each command receives the state produced by the commands before it, so positions and selections remain correct as the chain progresses.

Like direct commands, `.run()` returns `true` only when every command succeeds. Commands later in the chain still run if an earlier command returns `false`.

Build a chain before running it when the commands are determined asynchronously. The editor state is read at `.run()`, not when `editor.chain()` is called.

```js
const chain = editor.chain().setContent("# Draft").focus();

await saveDraft();

const applied = chain.run();
```

A chain can only be run once. Create a new one to apply more commands.

## Built-in commands

The core editor includes the following content and editor commands:

- `clearContent()` clears the document.
- `setContent(content)` replaces the complete document.
- `insertContent({ content, from, to? })` inserts or replaces content at a position or range.
- `deleteContent(from, to)` removes a document range.
- `cutContent(fromRange, toRange)` moves content from one range to another.
- `focus()` focuses the editor and scrolls it into view.

Formatting extensions add commands such as `toggleBold()`, `toggleItalic()`, `setHeading()`, and `insertHorizontalRule()`. Commands provided by extensions use the same direct and chained APIs.

We will provide a full API documentation in the future.
