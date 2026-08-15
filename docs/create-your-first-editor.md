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

## Line Wrapping

Long lines wrap inside the editor by default. Set `lineWrapping` to `false` to allow horizontal overflow instead:

```js
const editor = new Editor({
  element: mount,
  lineWrapping: false,
});
```

## Up Next

- [Styling](./styling.md)
- [Commands](./commands.md)
