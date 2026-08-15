# Styling

After [creating your editor](./create-your-first-editor.md) you will realize that your editor looks very boring. This is intended as inksane wants to be **headless** first - which means you need to bring your UI.

Since inksane is based on [CodeMirror 6](https://codemirror.net/) there are a few specialities around styling. Just throwing in CSS won't allow you to style everything with inksane because CodeMirror brings in a few styles on it's own that can only be overwritten by providing an **Theme**.

## Creating the Theme

First you will need to create a theme. For that, you will need to import the `EditorView` class from CodeMirror & create a new theme with it.

```js
import { EditorView } from "@codemirror/view";

const theme = EditorView.theme({
  ".cm-content": { paddingTop: "24px", paddingBottom: "24px", caretColor: "white" },
  ".cm-line": { paddingLeft: "24px", paddingRight: "24px" },
});
```

**Note**: we plan to make this easier in the future so you don't need to go through CodeMirror directly

This theme allows you to style CodeMirror elements directly. In this example we're adding top and bottom paddings to the editor content & left and right padding for each individually line.

Now you need to pass this theme into your editor instance like this:

```js
const editor = new Editor({
  element: mount,
  theme, // pass in your theme here
});
```

You will only need to pass through styles for elements strictly owned by CodeMirror.

## Styling via CSS

Besides the theme you will be able to style individual parts of the editor and the editor content yourself. By default all elements like bold text, italic text, headlines, lists, code, etc. will look just like normal content as CodeMirror is not using their actual HTML nodes.

This is an example style:

```css
// selector for the editor content
[data-inksane-editor-content] {
  font-family: sans-serif;

  // or pass in any font you want to use for your content

  // the styles for bold text
  .inksane-mark-bold {
    font-weight: bold;
  }

  // the styles for italic text
  .inksane-mark-italic {
    font-style: italic;
  }

  // the styles for links
  .inksane-mark-link {
    text-decoration: underline;
    color: indigo;
  }

  // the styles for the external link icon
  .inksane-mark-link-open {
    color: indigo;
    cursor: pointer;
    display: inline-block;
    margin-left: 4px;
    vertical-align: middle;
  }

  .inksane-mark-link-open svg {
    display: block;
    width: 1em;
    height: 1em;
  }

  // heading styles
  .inksane-mark-heading {
    font-weight: bold;
  }

  .inksane-heading-1 {
    font-size: 40px;
  }

  .inksane-heading-2 {
    font-size: 32px;
  }

  .inksane-heading-3 {
    font-size: 28px;
  }

  .inksane-heading-4 {
    font-size: 24px;
  }

  .inksane-heading-5 {
    font-size: 20px;
  }

  .inksane-heading-6 {
    font-size: 16px;
  }

  // styles for horizontal lines
  .inksane-mark-horizontal-rule {
    width: 100%;
    border-top: 1px solid #666;
    margin-block: 24px;
  }

  .inksane-hr {
    border: none;
    display: inline-block;
    height: 1px;
    margin: 0;
    vertical-align: middle;
    width: 100%;
  }

  // image styles
  .inksane-image {
    border-radius: 4px;
    cursor: text;
    display: inline-block;
    max-height: 320px;
    max-width: 100%;
    object-fit: contain;
    vertical-align: middle;
  }

  // image text styles
  .inksane-mark-image {
    color: #999;
  }

  // inline code styles
  .inksane-mark-inline-code {
    font-family: monospace;
    background: #e0e0e0;
    padding: 1px 4px;
    border-radius: 4px;
  }

  // code block styles
  .inksane-code-block {
    font-family: monospace;
    background: #e0e0e0;
  }

  // block quote styles
  .inksane-blockquote {
    border-left: 3px solid #303030;
    padding-left: 8px;
    color: #999;
  }

  // list styles
  .inksane-list-marker {
    display: inline-block;
    color: #999;
    padding-right: 6px;
    user-select: none;
  }

  // ordered list styles
  .inksane-list-marker--ordered {
    min-width: 1.75em;
    text-align: right;
  }
}
```
