import type { Extension as CMExtension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@inksane/core";
import { yCollab } from "y-codemirror.next";
import type * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";

/** Identity shown on this client's cursor to other collaborators. */
export interface CollaborationUser {
  name: string;
  /** Cursor color, used as-is for the caret. */
  color: string;
  /** Tint for the highlighted selection. Derived from `color` when omitted. */
  colorLight?: string;
}

export interface CollaborationOptions {
  /** Yjs document shared by every collaborator. */
  ydoc: Y.Doc;
  /** Name of the shared `Y.Text` field. Defaults to `"content"`. */
  field?: string;
  /** Awareness that broadcasts cursors. Defaults to a new one on the document. */
  awareness?: Awareness;
  /** Local user shown on remote cursors. Defaults to an anonymous identity. */
  user?: Partial<CollaborationUser>;
}

const DEFAULT_FIELD = "content";
const ANONYMOUS_NAME = "Anonymous";
const CURSOR_COLORS = ["#30bced", "#6eeb83", "#ffbc42", "#ee6352", "#9d4edd", "#1b998b"];

/** Shows the remote user's name next to the caret instead of only on hover. */
const caretNameTheme = EditorView.theme({
  ".cm-ySelectionInfo": {
    opacity: "1",
    fontFamily: "inherit",
  },
});

/** Picks a stable fallback identity from the awareness client id. */
function fallbackUser(clientID: number): Pick<CollaborationUser, "name" | "color"> {
  return { name: ANONYMOUS_NAME, color: CURSOR_COLORS[clientID % CURSOR_COLORS.length] };
}

/**
 * Adds Yjs collaboration to an editor. The document syncs through a shared
 * `Y.Text`. Remote cursors render through awareness with the user's name shown
 * next to each caret.
 *
 * The Y.Doc owns the document. When the shared text is empty and the editor was
 * given `content`, the text is seeded with it so the first client creates the
 * document. A client joining an existing document should pass the current
 * shared text as `content`.
 */
export function CollaborationExtension(options: CollaborationOptions): Extension {
  const { ydoc, field = DEFAULT_FIELD } = options;
  const awareness = options.awareness ?? new Awareness(ydoc);
  let userAnnounced = false;

  const announceUser = () => {
    if (userAnnounced) return;
    userAnnounced = true;
    const fallback = fallbackUser(awareness.clientID);
    const color = options.user?.color ?? fallback.color;
    awareness.setLocalStateField("user", {
      name: options.user?.name ?? fallback.name,
      color,
      colorLight: options.user?.colorLight ?? `${color}33`,
    });
  };

  return {
    name: "collaboration",
    priority: 100,

    addCodeMirrorExtensions({ editor }): CMExtension[] {
      const ytext = ydoc.getText(field);
      const content = editor.options.content;

      if (ytext.length === 0 && content) {
        ydoc.transact(() => ytext.insert(0, content));
      }

      announceUser();
      return [yCollab(ytext, awareness), caretNameTheme];
    },
  };
}
