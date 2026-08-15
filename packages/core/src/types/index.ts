export * from "./commands.ts";
export * from "./editor.ts";
export * from "./extensions.ts";

export type Range = {
  from: number;
  to: number;
};

export type PosOrRange = number | Range;
