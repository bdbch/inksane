import type { NamedCommand } from "../types/commands.ts";
import { insertContent } from "./insertContent.ts";

declare module "@inkwell/core" {
  interface Commands<ReturnType> {
    setContent: {
      setContent: (content: string) => ReturnType;
    };
  }
}

export const setContent: NamedCommand<"setContent"> = (ctx) => (content) => {
  return insertContent(ctx)({ content, from: 0, to: ctx.state.doc.length });
};
