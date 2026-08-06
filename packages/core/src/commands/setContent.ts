import { insertContent } from "./insertContent.ts";
import type { NamedCommand } from "./types.ts";

declare module "./types.ts" {
  interface InkwellCommands<ReturnType> {
    setContent: {
      setContent: (content: string) => ReturnType;
    };
  }
}

export const setContent: NamedCommand<"setContent"> = (ctx) => (content) => {
  return insertContent(ctx)({ content, from: 0, to: ctx.state.doc.length });
};
