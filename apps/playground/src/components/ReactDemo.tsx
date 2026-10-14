import { EditorView } from "@codemirror/view";
import { BaseKit } from "@inksane/core/extensions/base-kit";
import {
  Inksane,
  InksaneProvider,
  useInksane,
  useInksaneContext,
  useInksaneSelection,
} from "@inksane/react";

const providerSeed = `# Provider and context

The provider creates one editor. The toolbar and the editor both read it from
context, so they can live anywhere in the tree.

- Select some text
- Press a toolbar button
`;

const ownEditorSeed = `# Bring your own editor

This section creates the editor with \`useInksane\` and hands it to
\`<Inksane editor={editor} />\`.
`;

const theme = EditorView.theme({
  ".cm-content": { paddingTop: "16px", paddingBottom: "16px" },
  ".cm-line": { paddingLeft: "16px", paddingRight: "16px" },
});

const options = {
  extensions: [BaseKit()],
  theme,
  classNames: { editable: "font-sans" },
};

function Toolbar() {
  const editor = useInksaneContext();
  const selection = useInksaneSelection();

  const button =
    "rounded-md border px-3 py-1 text-sm hover:bg-background-muted disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b p-2">
      <button
        type="button"
        className={button}
        disabled={!editor}
        onClick={() => editor?.chain().toggleBold().focus().run()}
      >
        Bold
      </button>
      <button
        type="button"
        className={button}
        disabled={!editor}
        onClick={() => editor?.chain().toggleItalic().focus().run()}
      >
        Italic
      </button>
      <span className="ml-auto text-sm text-foreground-muted">
        {selection ? `selection ${selection.main.from} to ${selection.main.to}` : "no selection"}
      </span>
    </div>
  );
}

function ProviderDemo() {
  return (
    <InksaneProvider content={providerSeed} {...options}>
      <div className="overflow-hidden rounded-md border">
        <Toolbar />
        <Inksane />
      </div>
    </InksaneProvider>
  );
}

function OwnEditorDemo() {
  const editor = useInksane({ content: ownEditorSeed, ...options });

  return (
    <div>
      <div className="overflow-hidden rounded-md border">
        <Inksane editor={editor} />
      </div>
      <p className="mt-2 text-sm text-foreground-muted">
        {editor ? "Editor is ready." : "Creating editor..."}
      </p>
    </div>
  );
}

export default function ReactDemo() {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-2 text-lg font-semibold">Provider + context toolbar</h2>
        <ProviderDemo />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Bring your own editor</h2>
        <OwnEditorDemo />
      </section>
    </div>
  );
}
