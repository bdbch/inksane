# inksane

> a extendable markdown rich-text like editor inspired by [Obsidian](https://obsidian.md/)

**Warning**: This repo is still very early in development and far from a first release. If you want to help, feel free to contribute.

**Check out the [demo](https://bdbch.github.io/inksane/demos/default/) to see the editor in action.**

## Documentation

The documentation site lives in [`apps/docs`](./apps/docs). It is built with
[Astro](https://astro.build/) and [Fumadocs](https://fumadocs.dev/).

Run it locally:

```sh
pnpm dev:docs
```

The content is written in Markdown and MDX under
[`apps/docs/content/docs`](./apps/docs/content/docs).

## Getting Started

Install the core package:

```sh
pnpm install @inksane/core
```

Add an empty element to your page:

```html
<div id="editor"></div>
```

Then create and mount the editor:

```js
import { Editor } from "@inksane/core";

new Editor({
  element: document.getElementById("editor"),
  content: "# Hello, inksane!",
});
```

See [Create your first editor](./apps/docs/content/docs/introduction/quick-start.mdx) for the full setup guide.

## License

- inksane is licensed under the [MIT License](./LICENSE).

## Contributing

Contributions are welcome. Please read and follow the [contributor guidelines](./CONTRIBUTING.md) before opening a pull request.

## Contributors

- **Maintainers**
  - [bdbch](https://github.com/bdbch)

- **Contributors**
  - _Want to become a contributor to inksane? Go for it - I'm always looking for reoccuring contributors_
