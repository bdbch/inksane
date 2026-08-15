# inksane

> a extendable markdown rich-text like editor inspired by [Obsidian](https://obsidian.md/)

**Warning**: This repo is still very early in development and far from a first release. If you want to help, feel free to contribute.

## Documentation

- [Browse the documentation](./docs/README.md)

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

See [Create your first editor](./docs/create-your-first-editor.md) for the full setup guide.

## License

- inksane is licensed under the [MIT License](./LICENSE).

## Contributing

Contributions are welcome. Please read and follow the [contributor guidelines](./CONTRIBUTING.md) before opening a pull request.

## Contributors

- **Maintainers**
  - [bdbch](https://github.com/bdbch)

- **Contributors**
  - _Want to become a contributor to inksane? Go for it - I'm always looking for reoccuring contributors_
