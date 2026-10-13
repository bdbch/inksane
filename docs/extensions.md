# Extensions

Extensions add behavior to an editor. They can register commands, keybindings, Markdown parser extensions and decorations, CodeMirror extensions, or further extensions.

The editor includes its built-in extensions automatically. Add your own extensions with the `extensions` option when creating the editor:

```ts
import { Editor, type Extension } from "@inksane/core";

const MyExtension: Extension = {
  name: "my-extension",
};

const editor = new Editor({
  element: mount,
  extensions: [MyExtension],
});
```

Each distinct extension name must be unique across the complete extension tree. Duplicate names and circular child-extension graphs throw during editor creation. Reusing the same child-extension instance through multiple parents is deduplicated.

## Create an extension

An extension is an object with a required `name` and optional hooks. Every hook receives `{ editor }`, so it can read the editor instance and its options during setup.

```ts
import type { Extension } from "@inksane/core";

export const MyExtension: Extension = {
  name: "my-extension",
  priority: 10,

  addExtensions({ editor }) {
    return [];
  },

  addMarkdownSyntax({ editor }) {
    return [];
  },

  addMarkdownDecorations({ editor }) {
    return [];
  },

  addHtmlConverters({ editor }) {
    return [];
  },

  addCommands({ editor }) {
    return {};
  },

  addKeybinds({ editor }) {
    return [];
  },

  addCodeMirrorExtensions({ editor }) {
    return [];
  },
};
```

The setup hooks below run once while the editor is being created. They do not run again if the document changes.

## Configuration

`name` is required and identifies the extension. Use a stable, unique name.

`priority` is optional and defaults to `0`. Higher-priority extensions are initialized first. Avoid relying on priority to resolve command-name collisions; command names should be unique as well.

`addExtensions(ctx)` returns child extensions. Child extensions are resolved recursively and contribute to the same editor setup. Use it to compose a feature from smaller extensions.

`addCommands(ctx)` returns command implementations. See [Commands](./commands.md) for how consumers run them.

`addKeybinds(ctx)` returns CodeMirror `KeyBinding` objects, or `undefined` when it has no bindings. Each binding uses CodeMirror's key syntax, such as `Mod-Shift-t`, and its `run` callback must return whether it handled the key.

```ts
addKeybinds({ editor }) {
  return [
    {
      key: "Mod-Shift-t",
      run() {
        return editor.commands.insertTimestamp();
      },
    },
  ];
}
```

`addCodeMirrorExtensions(ctx)` returns CodeMirror `Extension` values. Use it for CodeMirror features that do not fit the higher-level hooks.

```ts
import { drawSelection } from "@codemirror/view";

addCodeMirrorExtensions() {
  return [drawSelection()];
}
```

## Commands

To expose a command with correct TypeScript types, augment the `Commands` interface from `@inksane/core`. Give the extension one namespace key and declare each public command with `ReturnType`. The same declaration makes the command return `boolean` on `editor.commands` and the chain itself on `editor.chain()`.

Then return a curried implementation from `addCommands`: the outer function receives the command context, and the inner function receives the public command arguments and returns a boolean.

```ts
import type { Extension } from "@inksane/core";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    timestamp: {
      insertTimestamp: () => ReturnType;
    };
  }
}

export const TimestampExtension: Extension = {
  name: "timestamp",

  addCommands() {
    return {
      insertTimestamp:
        ({ state, dispatch }) =>
        () => {
          const { from } = state.selection.main;
          dispatch({ changes: { from, insert: new Date().toISOString() } });
          return true;
        },
    };
  },
};
```

The declared command name and the key returned by `addCommands` must match exactly. Once `TimestampExtension` is configured on the editor, TypeScript recognizes both forms:

```ts
editor.commands.insertTimestamp(); // boolean

editor.chain().insertTimestamp().focus().run(); // boolean
```

The command context contains `editor`, the current `state`, the editor `view`, and `dispatch(spec)`. In a command chain, `state` is projected to include the changes made by earlier commands in that chain. Dispatch changes through `dispatch` rather than directly through `view.dispatch` so they remain part of the chain's single editor update.

## Markdown

### Parser extensions

`addMarkdownSyntax(ctx)` returns `MarkdownExtension` values from `@lezer/markdown`. inksane passes them to CodeMirror's Markdown parser, allowing an extension to add parsing support for custom Markdown syntax.

```ts
import type { MarkdownExtension } from "@lezer/markdown";

addMarkdownSyntax(): MarkdownExtension[] {
  return [myMarkdownSyntax];
}
```

`myMarkdownSyntax` must be a Lezer Markdown extension. Its node names are what `addMarkdownDecorations` uses to find syntax nodes.

### Decorations

`addMarkdownDecorations(ctx)` returns configuration for styling or replacing parsed Markdown nodes. It does not change parsing; pair it with `addMarkdownSyntax` when decorating custom syntax.

```ts
addMarkdownDecorations() {
  return [
    {
      nodeName: "StrongEmphasis",
      className: "my-extension-strong",
      hideSyntax: true,
    },
  ];
}
```

Each decoration entry supports these options:

- `nodeName` is required and must match a Lezer syntax-tree node name.
- `className` applies a CSS class to the complete node range.
- `lineClass` applies a CSS class to every line that intersects the node.
- `markup` selects the ranges treated as Markdown syntax. By default, these are the node's direct children whose names end in `Mark`. Pass child-node names, such as `["LinkMark", "URL"]`, or a function returning `{ from, to }` document ranges.
- `hideSyntax` hides the markup while the selection is outside the node. During a drag, a node the selection touches stays revealed until the pointer is released, so revealing cannot flicker.
- `widgets` adds replacement or attached CodeMirror widgets.

Widgets use CodeMirror's `WidgetType`. A `replace` widget replaces every markup range while syntax is hidden. Its `type` can be a widget instance or a function receiving the syntax node and editor state; set `block: true` for a block widget.

```ts
{
  kind: "replace",
  type: new MyWidget(),
  block: true,
}
```

An `attach` widget is placed before or after the node, or at a position returned by a function. It is shown only while syntax is hidden by default; set `onlyWhenHidden: false` to always show it.

```ts
{
  kind: "attach",
  position: "after",
  type: (node, state) => new MyWidget(state.doc.sliceString(node.from, node.to)),
  onlyWhenHidden: false,
}
```

## HTML

Extensions can render HTML without building DOM by hand. `htmlWidget` returns a widget that the editor renders for you, so a decoration only passes a string.

```ts
import { escapeHtml, htmlWidget, type Extension } from "@inksane/core";

export const CalloutExtension: Extension = {
  name: "callout",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "Callout",
        hideSyntax: true,
        markup: (node) => [{ from: node.from, to: node.to }],
        widgets: [
          {
            kind: "replace",
            block: true,
            type: (node, state) =>
              htmlWidget(
                `<div class="callout">${escapeHtml(state.sliceDoc(node.from, node.to))}</div>`,
                { block: true, className: "my-callout" },
              ),
          },
        ],
      },
    ];
  },
};
```

The markup is trusted because the extension writes it, so it is inserted as-is. The document is not trusted. Escape any document text you interpolate with `escapeHtml`, and validate URLs before you put them into attributes.

`htmlWidget(html, options)` renders inline by default and wraps the markup in a `span`. Set `block: true` to wrap it in a `div`. The wrapper always gets the `inksane-html` class, and `className` adds one more.

Use `onRender` to run code after the markup is mounted, such as attaching a click listener. The wrapper element is passed, so reach into the markup with `element.querySelector(...)`. Use `estimatedHeight` to hint the rendered height for off-screen layout.

For block widgets, put spacing on the wrapper as padding, not as margin. CodeMirror measures the widget's border box, so margins are invisible to its height map and selection coordinates drift. The wrapper already gets `display: flow-root` to keep margins of the rendered markup inside the measured box.

The built-in image, link, list, and horizontal rule extensions render through this helper.

The editor also ships an `HtmlExtension` that renders block-level HTML from the document, such as `<div>`, `<details>`, or `<table>`, and hides HTML comments. Clicking a rendered block moves the cursor into its source so it can be edited, and the up and down arrow keys move into an adjacent block. Document HTML is not trusted, so it is cleaned with `sanitizeHtml` first. That helper drops scripts, event handlers, and unsafe URLs, and unwraps unknown elements. Inline HTML at the top level of a paragraph is not rendered yet.

### Pasting HTML

Pasting copied HTML converts it to Markdown before it is inserted at the cursor or over the selection. The editor handles structure such as paragraphs, spacing, and escaping. Syntax such as bold, links, or lists comes from the extensions, so each extension teaches the editor how its own HTML becomes Markdown.

`addHtmlConverters(ctx)` returns `HtmlConverter` values. Each converter has a `match` predicate that claims an element and a `toMarkdown` function that serializes it. `toMarkdown` receives a context with `renderChildren(element)`, which converts the children and applies the converters again. Set `block: true` for block-level elements so they get blank lines around them.

```ts
addHtmlConverters() {
  return [
    {
      match: (element) => element.tagName.toLowerCase() === "mark",
      toMarkdown: (element, { renderChildren }) => `==${renderChildren(element).trim()}==`,
    },
  ];
}
```

Elements no converter claims keep their text, so an extension only covers the HTML for its own syntax. The input is cleaned with `sanitizeHtml` before any converter runs.

## Events

An extension can declare handlers named after editor events: `mount`, `unmount`, `beforeCreate`, `create`, `update`, `destroy`, `selectionUpdate`, `beforeTransaction`, and `transaction`. The extension manager subscribes them when the editor is created and removes them after `destroy` has been emitted. Each handler receives `{ editor }` and the event payload, and runs in priority order. Handlers are called as methods, so `this` is the extension object.

The editor currently emits only `beforeCreate`, `create`, `mount`, `unmount`, and `destroy`. The `update`, `selectionUpdate`, `beforeTransaction`, and `transaction` handlers are subscribed but not called until the editor emits those events.

```ts
const logger: Extension = {
  name: "logger",
  create({ editor }) {
    console.log("editor created", editor);
  },
};
```
