# Configuration Examples

This directory contains example configuration files for Geese's hierarchical configuration system.

## Configuration Files

### `global-config.json`
Copy to `~/.geese/config.json` for user-wide defaults.

```bash
mkdir -p ~/.geese
cp global-config.json ~/.geese/config.json
# Edit ~/.geese/config.json to customize your defaults
```

### `local-config.json`
Example of project-specific configuration.

```bash
# Initialize local config in your project
cd /path/to/your/project
geese config --init-local

# Then edit ./.geese/config.json with project-specific settings
```

## Configuration Hierarchy

Settings are merged in this order (later levels override earlier ones):

1. **Core Defaults** (built into Geese)
2. **Global Config** (`~/.geese/config.json`)
3. **Local Config** (`./.geese/config.json`)
4. **.geese File** (frontmatter properties with `$` prefix)
5. **CLI Arguments** (runtime overrides)

## Viewing Configuration

```bash
# View the effective configuration hierarchy
geese config --inspect

# View just the merged result
geese config --show

# Debug configuration when running
geese run --debug-config
```

## Common Configuration Patterns

### Pattern 1: Global Defaults, Local Overrides

**Global** (`~/.geese/config.json`):
```json
{
  "goose": {
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2000
  }
}
```

**Local** (`./.geese/config.json`):
```json
{
  "goose": {
    "temperature": 0.3,
    "recipe": "strict-review"
  }
}
```

**Result**: Uses gpt-4 model (from global), temperature 0.3 (from local), max_tokens 2000 (from global)

### Pattern 2: Per-File Configuration

**.geese file** with specific settings:
```yaml
---
$model: gpt-4-turbo
$temperature: 0.8
$recipe: custom-analysis
---
```

This overrides both global and local configurations for this specific file.

### Pattern 3: Runtime Overrides

```bash
# Override just for this run
geese run --model claude-3 --temperature 0.9

# Override nested properties
geese run --goose.model gpt-4 --goose.temperature 0.5
```

## Tips

1. **Keep global config minimal**: Set only your most common preferences
2. **Use local config for project specifics**: Team-wide settings, file patterns
3. **Use .geese files for task-specific settings**: Different prompts may need different temperatures
4. **Use CLI overrides for experimentation**: Try different settings without changing files

## Troubleshooting

If you're unsure which configuration is being used:

```bash
# View the complete hierarchy
geese config --inspect

# Run with debug output
geese run --debug-config

# Check a specific value's source
geese config --show | grep temperature
```
