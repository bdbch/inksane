# Create your first inksane editor

After you successfully [installed inksane](./installation.md) you are ready to implement the editor into your project. In this example we will use a basic Javascript implementation since framework-specific implementations are not ready yet.

First you'll need to import the `Editor` class into your project.

```js
import { Editor } from "@inksane/core";
```

Now you need an element to mount the editor in. This can be any HTML element - a best practice would be however to pass in a clean, empty node.

```js
// we pick the node by ID
// however you can also create it and mount it yourself
// via document.createElement
const mount = document.getElementById("editor");
```

Now that we have an element to mount into you can create the editor instance.

```js
const editor = new Editor({
  element: mount, // this registers the DOM element as the mount for the editor
});
```

And that's it. Reload and you should see an editor on your page. Here is the full script:

```js
import { Editor } from "@inksane/core";

// we pick the node by ID
// however you can also create it and mount it yourself
// via document.createElement
const mount = document.getElementById("editor");

const editor = new Editor({
  element: mount, // this registers the DOM element as the mount for the editor
});
```

## Initial Content

If you want to add initial content, you can pass through a string containing Markdown into the editor options:

```js
const initialContent = `
# Hello inksane

Have a lot of **fun with your new Markdown based editor**.

*Happy coding*
`;

const editor = new Editor({
  element: mount,
  content: initialContent,
});
```

## Reading and writing content

The document is Markdown, so read it with `getMarkdown()` and replace it with `setMarkdown()`:

```js
editor.getMarkdown(); // "# Hello inksane\n\nHave a lot of **fun**."

editor.setMarkdown("# Replaced\n\nNew content.");
```

`getMarkdown()` and `setMarkdown()` are the recommended serialization API. The `content` property reads and writes the same Markdown string.

If you specifically need CodeMirror's raw line array, use `textJSON`, which returns one string per line:

```js
editor.textJSON; // ["# Hello inksane", "", "Have a lot of **fun**."]

editor.textJSON = ["# Replaced", "", "New content."];
```

> **Deprecated:** `json` returns the same line array as `textJSON`, but its name promised a document AST. Use `getMarkdown()` to read the document or `textJSON` for the raw array instead. `json` will be removed in a future major release.

## Pasting HTML

When you copy content from a web page or another editor, the clipboard usually holds HTML. Paste it into inksane and the HTML is converted to Markdown before it is inserted at your cursor or over your selection.

Headings, paragraphs, emphasis, links, images, lists, blockquotes, and code are converted. The HTML is cleaned first, so scripts and unsafe URLs are dropped. Plain text that looks like an HTML fragment is converted too. Other plain text keeps the default editor behavior.

## Line Wrapping

Long lines wrap inside the editor by default. Set `lineWrapping` to `false` to allow horizontal overflow instead:

```js
const editor = new Editor({
  element: mount,
  lineWrapping: false,
});
```

## Links

Press Mod-K (Ctrl-K on Windows and Linux, Cmd-K on macOS) to create a link from the selected text. The link extension does not prompt for a URL on its own, so configure it with an `onLinkRequest` handler that returns one:

```js
import { Editor, LinkExtension } from "@inksane/core";

const editor = new Editor({
  element: mount,
  extensions: [
    LinkExtension({
      onLinkRequest: ({ text }) => window.prompt(`Link for "${text}"`),
    }),
  ],
});
```

Return `null` or an empty string to cancel, and the document is left unchanged. Pressing Mod-K on an existing link removes it without calling the handler. Without `onLinkRequest`, the extension does not define Mod-K at all.

## Placeholder

Pass a `placeholder` to show example text while the document is empty. It disappears as soon as any content exists:

```js
const editor = new Editor({
  element: mount,
  placeholder: "Write something…",
});
```

The placeholder is not part of the document, so it never appears in `getMarkdown()` and never moves the cursor. Style it through the `inksane-placeholder` class, for example `.inksane-placeholder::before { color: #999 }`.

## Up Next

- [Styling](./styling.md)
- [Commands](./commands.md)
