import type { EditorState, TransactionSpec } from "@codemirror/state";
import type { ChainedCommands, Command, CommandContext } from "~/types/commands.ts";
import type { Editor } from "~/Editor.ts";

/** One collected chain step: a command impl and the args to call it with. */
type CommandStep = {
  command: Command<unknown[]>;
  args: unknown[];
};

/** Flat map of command name to curried impl, populated by ExtensionManager. */
export type CommandRegistry = Record<string, Command<any[]>>;

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
    this.editor.view.dispatch(...specs);
  }
}
