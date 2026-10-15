import type { EditorState, TransactionSpec } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { ChainedCommands, Command, CommandContext, SingleCommands } from "./types/commands.ts";
import type { Editor } from "./Editor.ts";

/** One collected chain step: a command impl and the args to call it with. */
type CommandStep = {
  command: Command<unknown[]>;
  args: unknown[];
};

/** Flat map of command name to curried impl, populated by ExtensionManager. */
export type CommandRegistry = Record<string, Command<any[]>>;

/** Just enough of an {@link Editor} for commands to run against projected state. */
type SpeculativeEditor = {
  readonly state: EditorState;
  readonly view: EditorView;
  commands: SingleCommands;
};

/** Builds the bound commands object from a registry. */
export function createBoundCommands(editor: Editor, registry: CommandRegistry): SingleCommands {
  const bound = {} as Record<string, (...args: unknown[]) => boolean>;

  for (const name of Object.keys(registry)) {
    bound[name] = (...args: unknown[]) => {
      const chain = CommandChain.create(editor, registry);
      // Proxy forwards unknown keys to add(name, args), returns the chain.
      (chain as unknown as Record<string, (...args: unknown[]) => ChainedCommands>)[name](...args);
      return chain.run();
    };
  }

  return bound as unknown as SingleCommands;
}

/**
 * Editor-shaped sandbox that records dispatches into a projected state instead
 * of touching the real view, so a command can be evaluated without running it.
 */
function createSpeculativeEditor(editor: Editor, registry: CommandRegistry): Editor {
  let state = editor.state;

  const view = {
    dispatch: (...specs: TransactionSpec[]) => {
      for (const spec of specs) state = state.update(spec).state;
    },
    focus: () => {},
  } as unknown as EditorView;

  const sandbox: SpeculativeEditor = {
    get state() {
      return state;
    },
    get view() {
      return view;
    },
    get commands() {
      return createBoundCommands(sandbox as unknown as Editor, registry);
    },
  };

  return sandbox as unknown as Editor;
}

/**
 * Evaluates a command against a projected copy of the current state.
 * Returns false when the command could not apply, without changing the editor.
 */
export function canRunCommand(
  editor: Editor,
  registry: CommandRegistry,
  name: string,
  args: unknown[],
): boolean {
  if (!registry[name]) {
    throw new Error(`Command "${name}" is not registered.`);
  }

  const sandbox = createSpeculativeEditor(editor, registry);
  const commands = createBoundCommands(sandbox, registry) as Record<
    string,
    (...args: unknown[]) => boolean
  >;
  return commands[name](...args);
}

/**
 * Collects commands + args until `run()` executes them as one dispatch.
 * State is snapshotted at `run()`, not at construction, so chains can be
 * built async and run later.
 */
export class CommandChain {
  private editor: Editor;
  private registry: CommandRegistry;
  private steps: CommandStep[] = [];
  private done = false;

  constructor(editor: Editor, registry: CommandRegistry) {
    this.editor = editor;
    this.registry = registry;
  }

  /** Wraps a chain in a proxy so any command name becomes a chainable method. */
  static create(editor: Editor, registry: CommandRegistry): ChainedCommands {
    const chain = new CommandChain(editor, registry);
    const proxy = new Proxy(chain, {
      get(target, prop: string) {
        if (prop in target || typeof prop !== "string") {
          return Reflect.get(target, prop);
        }
        return (...args: unknown[]) => {
          target.add(prop, args);
          return proxy;
        };
      },
    });
    return proxy as unknown as ChainedCommands;
  }

  /** Pushes a step by command name. Called by the proxy on property access. */
  private add(name: string, args: unknown[]): this {
    const command = this.registry[name];
    if (!command) throw new Error(`Command "${name}" is not registered.`);
    this.steps.push({ command, args });
    return this;
  }

  /** Executes collected steps, then marks the chain as done. */
  run(): boolean {
    if (this.done) throw new Error("Chain already executed.");
    this.done = true;

    const state = this.snapshotState();
    const { specs, allSucceeded } = this.runSteps(state);
    // Read-only blocks document changes. Commands that only move the selection
    // or focus stay available, so a read-only editor can still be navigated.
    if (state.readOnly && specs.some((spec) => spec.changes)) return false;
    this.dispatchAll(specs);

    return allSucceeded;
  }

  /** Captures the editor state at the moment run() is called. */
  private snapshotState(): EditorState {
    return this.editor.state;
  }

  /** Walks steps, projecting state forward per command, collecting specs. */
  private runSteps(initialState: EditorState): {
    specs: TransactionSpec[];
    allSucceeded: boolean;
  } {
    const specs: TransactionSpec[] = [];
    let projected = initialState;
    let allSucceeded = true;

    for (const step of this.steps) {
      const ctx: CommandContext = {
        editor: this.editor,
        state: projected,
        view: this.editor.view,
        dispatch: (spec: TransactionSpec) => {
          specs.push(spec);
          projected = projected.update(spec).state;
        },
      };
      const succeeded = step.command(ctx)(...step.args);
      if (!succeeded) allSucceeded = false;
    }

    return { specs, allSucceeded };
  }

  /** Dispatches all collected specs to the view in one call. */
  private dispatchAll(specs: TransactionSpec[]): void {
    if (specs.length === 0) return;
    this.editor.view.dispatch(...specs.map((spec) => ({ ...spec, sequential: true })));
  }
}
