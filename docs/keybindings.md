# Keybindings

inksane registers a standard editing keymap on every editor. It covers the keys users expect from any text field or code editor, so common actions such as deleting a word, selecting a line, or searching do not read as missing features.

## Default keybindings

The default keymap is composed from CodeMirror's `defaultKeymap`, `searchKeymap`, and `indentWithTab`.

Standard editing keys include:

- Word and line deletion, such as `Mod-Backspace` and `Shift-Mod-k`.
- Line movement and selection, such as `Alt-ArrowUp`, `Mod-]`, and `Mod-/`.
- Home, End, page, and arrow navigation with the usual `Shift` variants for selection.
- Select all on `Mod-a`.

Enter and Backspace stay with the editor instead of the Markdown language keymap. Enter always inserts a newline and Backspace deletes a single character, even at the end of a list item or blockquote, so typing does not silently add list or quote markup.

Search keys include:

- `Mod-f` opens the Find panel.
- `Mod-g` and `F3` find the next match, with `Shift` for the previous one.
- `Mod-d` selects the next occurrence.
- `Mod-Alt-g` jumps to a line.

Undo and redo (`Mod-z`, `Mod-y`, `Mod-Shift-z`) come from the history extension, which owns its own keymap.

Tab and Shift-Tab indent and dedent the selected lines. The editor's own Tab binding takes precedence over `indentWithTab` and honors the `tabSize` option, defaulting to two spaces. `indentWithTab` stays registered as a fallback for setups that replace the built-in `keybinds` extension.

Extension bindings take precedence over the default keymap. For example, the italic extension keeps `Mod-i`, and the code extension keeps `Mod-.`, even though CodeMirror binds those keys too.

## Opt out

Pass `defaultKeymap: false` to skip the default keymap and register your own:

```ts
const editor = new Editor({
  element: mount,
  defaultKeymap: false,
  extensions: [
    {
      name: "my-keymap",
      addKeybinds() {
        return [{ key: "Mod-Shift-t", run: () => editor.commands.insertTimestamp() }];
      },
    },
  ],
});
```

The editor's own Tab indentation stays active when the default keymap is disabled. Only the CodeMirror defaults, search keys, and `indentWithTab` are removed.

## Replace or extend

The default keymap is a built-in extension named `defaultKeymap`. A configured extension with the same name replaces it, the same way any built-in extension is overridden:

```ts
import { defaultKeymap } from "@codemirror/commands";

const editor = new Editor({
  element: mount,
  extensions: [
    {
      name: "defaultKeymap",
      addKeybinds: () => [
        ...defaultKeymap,
        { key: "Mod-Shift-t", run: () => editor.commands.insertTimestamp() },
      ],
    },
  ],
});
```

Replacing the extension also disables the built-in, so the returned list defines the complete default keymap.
