import type { EditorState, TransactionSpec } from "@codemirror/state";
import type { Editor } from "../Editor.ts";
import type { EditorView } from "@codemirror/view";

/**
 * Global command registry. Extensions augment this with one namespace key
 * per extension, mapping command names to `(args) => ReturnType`.
 * `ReturnType` is generic so one declaration projects to all three views.
 *
 * @example
 * declare module "@inksane/core" {
 *   interface Commands<ReturnType> {
 *     myExtension: {
 *       setContent: (args: { content: string }) => ReturnType
 *     }
 *   }
 * }
 */
// oxlint-disable-next-line - the ReturnType is never used, which is what is expected here
export interface Commands<ReturnType = any> {}

/** Runtime context handed to a command. State is projected (post prior steps). */
export interface CommandContext {
  editor: Editor;
  state: EditorState;
  view: EditorView;
  dispatch: (spec: TransactionSpec) => void;
}

/** Curried impl: ctx applied at construction, args at call time. Returns false to skip. */
export type Command<Args extends any[] = any[]> = (
  ctx: CommandContext,
) => (...args: Args) => boolean;

/** Turns a union of object types into an intersection of those types. */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/** Gets the union of value types from an object/record type. */
export type ValuesOf<T> = T[keyof T];

/** Picks keys whose values extend `Type`. Used to select namespace objects. */
export type KeysWithTypeOf<T, Type> = {
  [P in keyof T]: T[P] extends Type ? P : never;
}[keyof T];

/** Flattens namespaced augmentations into `commandName: (args) => ReturnType`. */
export type UnionCommands<ReturnType = boolean> = UnionToIntersection<
  ValuesOf<Pick<Commands<ReturnType>, KeysWithTypeOf<Commands<ReturnType>, object>>>
>;

/** What `addCommands` returns: curried impl keyed by command name. */
export type RawCommands = {
  [K in keyof UnionCommands]: (ctx: CommandContext) => UnionCommands<boolean>[K];
};

export type NamedCommand<T extends keyof RawCommands> = RawCommands[T];

/** What `editor.commands` exposes: ctx applied, returns boolean. */
export type SingleCommands = {
  [K in keyof UnionCommands]: UnionCommands<boolean>[K];
};

/** What `editor.chain()` exposes: each command returns the chain for composition. */
export type ChainedCommands = {
  [K in keyof UnionCommands]: UnionCommands<ChainedCommands>[K];
} & {
  /** Snapshots state, runs steps, dispatches once. */
  run: () => boolean;
};
