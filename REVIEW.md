# Holistic Code Review & Architecture Plan for Geese

## 1. Executive Summary

The current "Geese" project establishes a solid foundation for a CLI-based AI file processing tool. It successfully handles file discovery, basic frontmatter parsing, and executing an external process (`goose`). However, to meet the advanced requirements for dynamic variable evaluation (`^` prefix), flexible runner selection (`$cli`), generic CLI argument handling (`$` prefix), and a more robust CLI interface with configuration and template generation, a significant architectural refactoring is required.

This document outlines the necessary changes to evolve the current specific implementation into a generic, extensible framework.

## 2. Architectural Refactoring Plan

### 2.1. Advanced Frontmatter Processing Pipeline

**Current State:**
`GeeseParser` uses `gray-matter` to parse YAML and treats all values as static. It separates variables into "Goose Config" (starting with `@`) and "Context".

**Required Change:**
Implement a multi-stage processing pipeline for frontmatter variables to support the requested order: **System -> Static -> Javascript**.

1.  **System Stage:** Extract system variables (e.g., `$cli`, `$timeout`). These control *how* the tool runs.
2.  **Static Stage:** Process standard YAML keys as static context variables.
3.  **Dynamic Stage (Javascript):** specific keys prefixed with `^` are treated as JavaScript expressions. These are evaluated in a sandboxed environment that has access to the variables defined in the previous stages.

### 2.2. Abstract Runner System

**Current State:**
`GooseRunner` is tightly coupled to the `goose` CLI command and manually maps specific configuration keys (like `model`, `recipe`) to flags. `bin/geese.js` instantiates `GooseRunner` directly.

**Required Change:**
1.  **Abstract Runner Interface:** Create a base `AbstractRunner` class that defines the contract for all CLI tools.
2.  **Generic Argument Parsing:** Implement logic to automatically map keys starting with `$` (e.g., `$model`, `$verbose`) to CLI arguments (e.g., `--model`, `--verbose`), removing the need for hardcoded mappings in the runner.
3.  **Runner Factory:** A mechanism to instantiate the correct runner based on the `$cli` system variable found in the frontmatter.
4.  **Template Generation:** Runners must provide default templates/properties to support the `new` command.

### 2.3. Enhanced Runner Interface (Streams & Events)

**Current State:**
The runner buffers `stdout` and `stderr` and returns them only after the process completes.

**Required Change:**
The `run` method should return an event emitter or stream interface to allow real-time logging of the underlying tool's output to the user, while still capturing the final result for the report.

---

## 3. Detailed Implementation Specifications

### 3.1. Component: GeeseParser Refactor

The `prepareContext` method needs to be completely rewritten to handle the new variable types and evaluation order.

#### Proposed Logic:

```javascript
const vm = require('vm');

class GeeseParser {
  // ... existing code ...

  /**
   * Process frontmatter with ordered stages: System -> Static -> Dynamic
   */
  processFrontmatter(frontmatter) {
    const system = {};
    const context = {};
    const dynamicKeys = [];
    const cliArgs = {};

    // Stage 1: Classification
    for (const [key, value] of Object.entries(frontmatter)) {
      if (key === '$cli') {
        system.cli = value; // The runner to use
      } else if (key.startsWith('$')) {
        // CLI Arguments for the runner (e.g. $model -> --model)
        cliArgs[key.substring(1)] = value;
      } else if (key.startsWith('^')) {
        // Dynamic variables to be evaluated later
        dynamicKeys.push(key);
      } else {
        // Static variables
        context[key] = value;
      }
    }

    // Stage 2: Dynamic Evaluation (JavaScript)
    // Create a sandbox with existing context
    const sandbox = { ...context, ...system, console };
    vm.createContext(sandbox);

    for (const key of dynamicKeys) {
      const varName = key.substring(1); // Remove ^ prefix
      const scriptCode = value; // The value is the JS code to run

      try {
        // Run the script. result is the value of the last expression
        const result = vm.runInContext(scriptCode, sandbox);
        context[varName] = result;

        // Update sandbox so subsequent dynamic vars can see this one
        sandbox[varName] = result;
      } catch (err) {
        throw new Error(`Failed to evaluate dynamic variable '${key}': ${err.message}`);
      }
    }

    return { system, context, cliArgs };
  }
}
```

### 3.2. Component: AbstractRunner & Implementations

We need a base class that handles the generic `$` -> `--arg` mapping and provides templates.

#### Proposed Class Structure:

```javascript
const { spawn } = require('child_process');
const EventEmitter = require('events');

class AbstractRunner extends EventEmitter {
  constructor(name) {
    super();
    this.name = name; // e.g., 'goose', 'gemini'
  }

  /**
   * Returns default template properties for the 'new' command.
   * This is used to populate a fresh .geese file.
   */
  static getTemplate() {
    return {
      // Base requirements
      include: ["src/**/*.js"],
      recipe: "default-recipe",
      // CLI specific defaults
      $cli: "abstract",
      $model: "default-model"
    };
  }

  /**
   * Converts generic args object to CLI flag array.
   * { model: 'gpt-4', verbose: true } -> ['--model', 'gpt-4', '--verbose']
   */
  buildCliArgs(args) {
    const cliFlags = [];
    for (const [key, value] of Object.entries(args)) {
      const flag = key.length > 1 ? `--${key}` : `-${key}`;

      if (value === true) {
        cliFlags.push(flag);
      } else if (value !== false && value !== null) {
        cliFlags.push(flag, String(value));
      }
    }
    return cliFlags;
  }

  /**
   * Core execution method.
   * Returns a promise that resolves with final output,
   * but emits events for streaming.
   */
  run(prompt, cliArgs, context) {
    return new Promise((resolve, reject) => {
      const args = this.buildCliArgs(cliArgs);

      const proc = spawn(this.name, args, { shell: true });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        const str = data.toString();
        stdout += str;
        this.emit('log', str); // Stream to UI
      });

      proc.stderr.on('data', (data) => {
        const str = data.toString();
        stderr += str;
        this.emit('error-log', str); // Stream error logs
      });

      if (prompt) {
        proc.stdin.write(prompt);
        proc.stdin.end();
      }

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ output: stdout, stderr });
        } else {
          reject(new Error(`Process exited with code ${code}\n${stderr}`));
        }
      });
    });
  }
}

class GooseRunner extends AbstractRunner {
  constructor() {
    super('goose');
  }

  static getTemplate() {
    return {
      include: ["src/**/*.js"],
      recipe: "code-review",
      $cli: "goose",
      $model: "gpt-4",
      $temperature: 0.7
    };
  }
}
```

### 3.3. Component: RunnerFactory

A simple factory to instantiate the requested runner.

```javascript
class RunnerFactory {
  static getRunner(name) {
    switch (name.toLowerCase()) {
      case 'goose': return new GooseRunner();
      case 'gemini': return new GeminiRunner();
      // ... extensions
      default: throw new Error(`Unknown runner: ${name}`);
    }
  }

  static getRunnerClass(name) {
     // useful for accessing static getTemplate()
     // ...
  }
}
```

### 3.4. CLI Command Structure (Verbs)

The CLI will be refactored to use explicit verbs.

#### `geese config`
*   **Purpose:** persistent configuration management.
*   **Behavior:**
    *   Reads/Writes to `~/.geese/config.json`.
    *   Accepts `--property value` to set values.
    *   Supports grouping by CLI tool (e.g., `goose.model`).
*   **Code Snippet:**
    ```javascript
    program.command('config')
      .option('--property <key:value>', 'Set a property (e.g., goose.model:gpt-4)')
      .action((options) => {
         // Load or create ~/.geese/config.json
         // Update JSON
         // Save
      });
    ```

#### `geese new`
*   **Purpose:** Create new `.geese` files quickly.
*   **Arguments:** `name` (required), `tool` (optional, default: 'goose').
*   **Behavior:**
    *   Uses `RunnerFactory` to get the target runner class.
    *   Calls `Runner.getTemplate()` to get the default frontmatter structure.
    *   Writes a new file `[name].geese` with the generated frontmatter and a basic template body.

#### `geese run`
*   **Purpose:** Execute processing (replaces current default behavior).
*   **Arguments:** `[file]` (optional).
*   **Behavior:**
    *   **Single Argument:** If `[file]` is provided, run that specific file.
    *   **Context:** If no argument, look in current directory.
        *   If 1 `.geese` file found -> Run it.
        *   If >1 `.geese` files found -> Show interactive selection menu.

### 3.5. Configuration Management

Configuration precedence will be:
1.  **System Defaults:** Hardcoded in the Runner class.
2.  **User Config:** `~/.geese/config.json` (loaded at startup).
3.  **Frontmatter:** Variables defined in the `.geese` file override everything.

## 4. Gap Analysis & Required Changes

| Feature | Current Implementation | Required Implementation | Action Items |
| :--- | :--- | :--- | :--- |
| **Variable Processing** | Static parsing via `gray-matter`. | Multi-stage: System -> Static -> Dynamic (JS with `vm`). | Modify `GeeseParser.prepareContext`. Add `vm` logic. |
| **Runner Architecture** | Hardcoded `GooseRunner`. | `AbstractRunner` base class + `RunnerFactory`. | Create `AbstractRunner`. Refactor `GooseRunner`. Create `RunnerFactory`. |
| **CLI Verbs** | Single entry point (`geese [dir]`). | `config`, `new`, `run` subcommands. | Refactor `bin/geese.js` to use `commander` subcommands. |
| **Configuration** | None. | `~/.geese/config.json` support. | Implement `ConfigManager` class to handle load/save/merge of global config. |
| **Templates** | None. | `new` command generates file from Runner defaults. | Implement `getTemplate()` in Runners. Implement `new` command logic. |
| **CLI Arguments** | Manual mapping. | Generic mapping (`$key` -> `--key`). | Implement `buildCliArgs` in `AbstractRunner`. |
| **Output Handling** | Buffered. | Streaming. | Update `AbstractRunner` to emit events. Update `run` command to listen. |

## 5. Migration Strategy

1.  **Phase 1: Architecture Core**: Create `AbstractRunner`, `RunnerFactory`, and the new `GeeseParser` logic.
2.  **Phase 2: Configuration**: Implement the `ConfigManager` to handle `~/.geese/config.json`.
3.  **Phase 3: CLI Refactor**: rewrite `bin/geese.js` to support the `config`, `new`, and `run` verbs, integrating the components from Phase 1 & 2.
4.  **Phase 4: Validation**: Verify all verbs work as expected and the legacy behavior (running `geese` without args) is properly redirected to `geese run`.
