# How-to: Manage Configuration

Geese uses a hierarchical configuration system that allows you to set defaults globally while overriding them for specific projects or runs.

## Configuration Levels

Geese resolves configuration in this order (highest priority first):

1.  **CLI Arguments**: Flags passed to the command (e.g., `--model gpt-4`).
2.  **.geese File**: Frontmatter in the template file.
3.  **Local Config**: `.geese/config.json` in your project root.
4.  **Global Config**: `~/.geese/config.json` in your home directory.
5.  **Core Defaults**: Hardcoded defaults in Geese.

## Viewing Configuration

To see the current configuration and where each value comes from, use:

```bash
geese config --list
```

## Setting Global Defaults

Use the CLI to set global defaults. This modifies `~/.geese/config.json`.

```bash
# Set the default model for the 'goose' tool
geese config --set goose.model gpt-4

# Set the default tool to use
geese config --set defaultTool aider
```

## Setting Local (Project) Defaults

To configure a specific project, create or edit `.geese/config.json` in the project root.

```bash
mkdir -p .geese
echo '{ "goose": { "temperature": 0.2 } }' > .geese/config.json
```

Geese automatically detects this file when you run it from within the project.

## Environment Variables

Some Runners may support environment variables (like API keys). These are typically handled by the runner itself, not the Geese config system, but you can reference them in your custom runners.

## Common Settings

| Key | Description | Default |
| :--- | :--- | :--- |
| `defaultTool` | The AI runner to use. | `goose` |
| `goose.model` | Model for the default runner. | `gpt-4` |
| `goose.temperature` | Creativity (0.0 - 1.0). | `0.7` |
| `logLevel` | Output verbosity. | `info` |

See [Configuration Reference](../reference/config-settings.md) for a complete list.
