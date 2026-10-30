import { insertContent } from "../commands/index.ts";
import type { CommandContext } from "../types/commands.ts";
import type { PosOrRange } from "../types/index.ts";
import { resolveFromTo } from "./resolveFromTo.ts";
import { getActiveMarkRange } from "./stateQueries.ts";

/** Toggles a parsed inline mark, including an empty pair inserted at the caret. */
export function toggleInlineMark(
  ctx: CommandContext,
  nodeName: string,
  marker: string,
  pos?: PosOrRange,
): boolean {
  const { from, to } = resolveFromTo(ctx.state, pos);
  const width = marker.length;
  let range = getActiveMarkRange(
    ctx.state,
    [{ name: nodeName, nodeNames: [nodeName] }],
    nodeName,
    from,
  );
  if (range && (to > range.to || (from === to && (from === range.from || from === range.to)))) {
    range = null;
  }

  // Empty markers have no syntax node until text is typed between them.
  if (
    !range &&
    from === to &&
    from >= width &&
    from + width <= ctx.state.doc.length &&
    ctx.state.sliceDoc(from - width, from + width) === marker + marker
  ) {
    range = { from: from - width, to: from + width };
  }
  if (range) {
    ctx.dispatch({
      changes: [
        { from: range.from, to: range.from + width },
        { from: range.to - width, to: range.to },
      ],
    });
    return true;
  }
  if (from === to) {
    ctx.dispatch({
      changes: { from, insert: marker + marker },
      selection: { anchor: from + width },
    });
    return true;
  }
  return insertContent(ctx)({
    content: `${marker}${ctx.state.sliceDoc(from, to)}${marker}`,
    from,
    to,
  });
}
