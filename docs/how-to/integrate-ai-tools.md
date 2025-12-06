# How-to: Integrate AI Tools (Custom Runners)

This guide explains how to create "Runners" to integrate any CLI-based AI tool (like Aider, Claude, or custom scripts) with Geese.

## Concept

A **Runner** acts as a bridge between Geese and an external AI tool. It is responsible for:
1.  Constructing the CLI command for the tool.
2.  Passing the generated prompt to the tool.
3.  Handling the output.

## Directory Structure

Runners can be global or local:
*   **Global**: `~/.geese/runners/<tool-name>/`
*   **Local**: `./.geese/runners/<tool-name>/`

## Generating a Runner

Use the CLI to scaffold a new runner:

```bash
geese runner new my-tool -d "Integration for My AI Tool"
```

This creates:
*   `MyToolProvider.js`: Defines configuration and arguments.
*   `MyToolRunner.js`: Handles execution logic.
*   `index.js`: Exports the modules.

## Customizing the Provider

Edit `MyToolProvider.js` to map Geese configuration to your tool's CLI arguments.

```javascript
class MyToolProvider extends IAIToolProvider {
  // The command to run in the shell
  getDefaultPath() {
    return 'my-tool-cli';
  }

  // Map config to arguments
  buildArgs(config) {
    const args = [];

    // Example: --model gpt-4
    if (config.model) {
      args.push('--model', config.model);
    }

    // Example: --verbose
    if (config.verbose) {
      args.push('--verbose');
    }

    return args;
  }

  // Define default values for new .geese files using this tool
  getDefaultFrontmatter() {
    return {
      model: 'gpt-4',
      recipe: 'general'
    };
  }
}
```

## Customizing the Runner

Edit `MyToolRunner.js` if you need special handling for input/output (e.g., if the tool doesn't accept input via stdin).

Most CLI tools work with the default `ToolExecutor`, which pipes the prompt to the tool's stdin.

## Using Your Runner

Once created, specify the tool in your `.geese` file or via CLI:

```bash
geese new task --tool my-tool
```

Or in `.geese` frontmatter:
```yaml
_tool: "my-tool"
```

## Troubleshooting

*   **Tool not found**: Ensure the runner directory name matches the tool name you use in the command.
*   **Command failures**: Use `geese run --dry-run` to see the exact command Geese is trying to execute.
