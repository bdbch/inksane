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
- `hideSyntax` hides the markup ranges while the selection is outside the node.
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

## Events

The `Extension` type currently permits handlers named after editor events: `mount`, `unmount`, `beforeCreate`, `create`, `update`, `destroy`, `selectionUpdate`, `beforeTransaction`, and `transaction`. The extension manager does not yet subscribe these handlers, so they are not invoked. Subscribe with `editor.on(...)` in application code, or use a CodeMirror extension, until extension lifecycle handlers are implemented.
