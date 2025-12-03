# Geese Features Overview

**Version:** 1.0.0  
**Last Updated:** 2024-12-03

This document provides a comprehensive overview of all Geese features from a user perspective. For technical implementation details, see the architecture documentation.

---

## Table of Contents

1. [Core Features](#core-features)
2. [Configuration System](#configuration-system)
3. [File Processing](#file-processing)
4. [Pipe Operations](#pipe-operations)
5. [Custom Pipes](#custom-pipes)
6. [CLI Commands](#cli-commands)
7. [Templates](#templates)
8. [Dry-Run Mode](#dry-run-mode)
9. [Security Features](#security-features)

---

## Core Features

### AI-Powered File Processing

Geese processes `.geese` files to apply AI-powered transformations to your codebase. Each `.geese` file defines:
- Which files to process (include/exclude patterns)
- What AI model and settings to use
- What prompt template to apply
- Custom context variables and transformations

**Use Cases:**
- Code review automation
- Documentation generation
- Refactoring assistance
- Code quality checks
- Custom analysis tasks

---

### Hierarchical Configuration

Geese uses a 4-level configuration hierarchy that allows you to set defaults at different scopes:

1. **Core Defaults** (Built-in)
2. **Global Config** (`~/.geese/config.json`) - User-wide settings
3. **Local Config** (`./.geese/config.json`) - Project-specific settings
4. **File Config** (`.geese` file frontmatter) - Recipe-specific settings
5. **CLI Arguments** (Command line) - Runtime overrides

**Priority:** CLI Arguments → File Config → Local Config → Global Config → Core Defaults

**Example:**
```bash
# Set global default model
geese config --set goose.model gpt-4

# Project can override in ./.geese/config.json
# Individual .geese files can override with $model
# CLI can override with --model flag
```

---

### File Discovery

Geese automatically discovers `.geese` files from three locations:

1. **Global Directory** (`~/.geese/`) - User-wide recipes
2. **Local Directory** (`./.geese/`) - Project-specific recipes  
3. **Root Directory** (`./`) - Root-level recipes

**Interactive Selection:**
When multiple `.geese` files are found, Geese presents an interactive menu to choose which recipe to run.

---

## Configuration System

### Setting Configuration

```bash
# Set a configuration value
geese config --set key.path value

# Examples
geese config --set goose.model gpt-4o
geese config --set goose.temperature 0.7
geese config --set goose.recipe code-review
```

### Getting Configuration

```bash
# Get a specific value
geese config --get goose.model

# List all configuration
geese config --list

# List with sources (shows where each value comes from)
geese config --list --with-sources
```

### Deleting Configuration

```bash
# Delete a specific key
geese config --delete goose.temperature

# Clear entire tool configuration
geese config --delete goose
```

### Configuration Scope

**Global Configuration:** `~/.geese/config.json`
- User-wide defaults
- Shared across all projects
- Good for model preferences, API keys

**Local Configuration:** `./.geese/config.json`
- Project-specific settings
- Overrides global settings
- Good for project conventions

---

## File Processing

### Basic Processing

```bash
# Run interactively (choose .geese file and files to process)
geese run

# Run specific .geese file
geese run path/to/recipe.geese

# Run with dry-run to preview
geese run --dry-run
```

### File Selection Patterns

In your `.geese` file, specify which files to include/exclude:

```yaml
$include:
  - "src/**/*.js"
  - "lib/**/*.ts"
$exclude:
  - "**/*.test.js"
  - "node_modules/**"
  - "dist/**"
```

**Pattern Syntax:**
- `**` - Matches any directory depth
- `*` - Matches any characters in file/directory name
- `?` - Matches single character
- `[abc]` - Matches any character in brackets

### Interactive File Selection

When running `geese run`, you can:
1. Choose which `.geese` file to use
2. See a preview of matched files
3. Select which files to actually process
4. Skip files you don't want to process

---

## Pipe Operations

### What Are Pipes?

Pipes allow you to transform values in `.geese` file templates using a Unix-like pipeline syntax with the `~>` operator.

### Basic Syntax

```yaml
property_name: "initial value" ~> operation1 ~> operation2 arg1 arg2
```

### String Operations

```yaml
# Convert to uppercase
title: "hello world" ~> toUpperCase
# Result: "HELLO WORLD"

# Trim whitespace
cleaned: "  text  " ~> trim
# Result: "text"

# Chain operations
formatted: "hello" ~> toUpperCase ~> trim
# Result: "HELLO"

# Substring
short: "hello world" ~> substring 0 5
# Result: "hello"

# Replace
updated: "foo bar" ~> replace foo baz
# Result: "baz bar"
```

### List Operations

```yaml
# Split and join
csv: "a,b,c" ~> split , ~> join " | "
# Result: "a | b | c"

# Get first element
first: "a,b,c" ~> split , ~> first
# Result: "a"

# Get last element
last: "a,b,c" ~> split , ~> last
# Result: "c"

# Filter list
filtered: "1,2,3,4,5" ~> split , ~> filter >3
# Result: ["4", "5"]

# Sort list
sorted: "3,1,2" ~> split , ~> sort
# Result: ["1", "2", "3"]
```

### File Operations

```yaml
# Read file contents
readme: "" ~> readFile README.md

# Load and parse JSON
config: "" ~> loadFile config.json

# Load and parse YAML
settings: "" ~> loadFile settings.yaml
```

### Type Conversion

```yaml
# Parse JSON
data: '{"key":"value"}' ~> parseJson

# Stringify object
json: "{{object}}" ~> stringify

# Convert to number
count: "42" ~> toNumber
```

### Regex Operations

```yaml
# Test pattern
is_valid: "test@example.com" ~> test @.*\.com$
# Result: true

# Match pattern
domain: "user@example.com" ~> match @(.+)$ ~> first
# Result: "example.com"
```

### Utility Operations

```yaml
# Provide default value if empty
name: "" ~> default "Anonymous"
# Result: "Anonymous"

# Echo value
debug: "test" ~> echo
# Outputs to console and returns value
```

---

## Custom Pipes

### Creating Custom Pipes

You can create custom pipe operations and place them in:
- **Global:** `~/.geese/pipes/` - Available to all projects
- **Local:** `./.geese/pipes/` - Available to current project only

**Example Custom Pipe:** `~/.geese/pipes/reverse.js`

```javascript
/**
 * Reverses a string
 */
function reverse(value, args, context) {
  return String(value).split('').reverse().join('');
}

module.exports = reverse;
```

**Usage:**
```yaml
backwards: "hello" ~> reverse
# Result: "olleh"
```

### Pipe Inheritance

Local pipes override global pipes with the same name:

1. **Built-in operations** (lowest priority)
2. **Global custom pipes** (`~/.geese/pipes/`)
3. **Local custom pipes** (`./.geese/pipes/`, highest priority)

---

## CLI Commands

### geese run

Process files using a `.geese` recipe.

```bash
# Interactive mode
geese run

# Specific recipe
geese run code-review.geese

# Specific directory
geese run ./src

# With options
geese run --dry-run
geese run --model gpt-4
geese run --temperature 0.8
```

**Options:**
- `--dry-run` - Preview without executing
- `--dry-run-file <path>` - Write dry-run to file
- `--model <model>` - Override AI model
- `--temperature <value>` - Override temperature
- `--recipe <name>` - Override recipe

---

### geese new

Create a new `.geese` file.

```bash
# Create in .geese directory (default)
geese new code-review

# Create in custom location
geese new path/to/custom-recipe

# Specify output directory
geese new my-recipe --output ./recipes
```

**Creates:**
- File with `.geese` extension
- Frontmatter with default configuration
- Template section with placeholders
- Example properties and pipes

**Default template includes:**
- `$include` and `$exclude` patterns
- `$recipe` selection
- `$model` setting (from config)
- Example template with `{{filename}}` variable

---

### geese config

Manage configuration settings.

```bash
# View all configuration
geese config --list

# View with sources
geese config --list --with-sources

# Get specific value
geese config --get goose.model

# Set value
geese config --set goose.model gpt-4o
geese config --set goose.temperature 0.7

# Delete value
geese config --delete goose.temperature

# Delete all for a tool
geese config --delete goose
```

---

### geese --help

Display help information.

```bash
# General help
geese --help

# Command-specific help
geese run --help
geese config --help
geese new --help
```

---

### geese --version

Display version information.

```bash
geese --version
```

---

## Templates

### Template Syntax

Templates use Handlebars syntax for variable substitution.

```yaml
---
$include:
  - "**/*.js"
$recipe: "code-review"

# Custom properties (available as template variables)
project_name: "My Project"
author: "Jane Doe"
---

Review the file {{filename}} in the {{project_name}} project.
Author: {{author}}

File content:
{{file_content}}
```

### Built-in Variables

- `{{filename}}` - Current file being processed
- `{{file_content}}` - Content of current file
- `{{filepath}}` - Full path to file
- Any custom properties you define

### Custom Properties with Pipes

```yaml
formatted_name: "{{project_name}}" ~> toUpperCase
file_count: "{{files}}" ~> split , ~> length
```

---

## Dry-Run Mode

### Console Dry-Run

Preview what would be executed without actually running it.

```bash
geese run --dry-run
```

**Output:**
```
📋 Dry-Run Mode (Console Output)
────────────────────────────────────────────────────────────

🔧 Command:
  goose session start --model gpt-4 --recipe code-review

📥 Arguments:
  [0] session
  [1] start
  [2] --model
  [3] gpt-4
  [4] --recipe
  [5] code-review

📝 Standard Input (stdin):
    1 | Review this file...
    2 | 
    3 | File: src/app.js

────────────────────────────────────────────────────────────
✓ Dry-run complete (no actual execution)
```

### File Dry-Run

Write dry-run output to a file for later review.

```bash
geese run --dry-run-file ./output.txt
```

**Output File Format:**
```yaml
---
executable: goose
args:
  - --model
  - gpt-4
  - --recipe
  - code-review
timestamp: 2024-12-03T10:30:00.000Z
---

Review this file...

File: src/app.js
[file content]
```

---

## Security Features

### Input Validation

Geese automatically validates and sanitizes:

**Prototype Pollution Protection:**
- Blocks `__proto__`, `constructor`, `prototype` in configuration paths
- Prevents object injection attacks

**Path Traversal Protection:**
- Blocks `../` patterns in file paths
- Prevents access to system directories (`/etc`, `/sys`, `/proc`)
- Validates file paths before reading

**XSS Protection:**
- Sanitizes HTML/script content in templates
- Removes dangerous event handlers
- Escapes special characters

**Command Injection Protection:**
- Validates command-line arguments
- Blocks dangerous shell characters
- Sanitizes user input

### Rate Limiting

File operations are rate-limited to prevent resource exhaustion:

- **Default:** 50 file reads per second
- **Burst Capacity:** Allows brief spikes
- **Auto-Recovery:** Tokens refill over time

### Configuration Security

- Configuration files are stored in user's home directory
- Uses JSON for safe serialization
- Validates all configuration values
- Guards against prototype pollution

---

## Best Practices

### Organizing .geese Files

**Global Recipes** (`~/.geese/`):
- Reusable across projects
- General-purpose recipes
- Personal templates

**Local Recipes** (`./.geese/`):
- Project-specific recipes
- Team-shared templates
- Project conventions

**Root Recipes** (`./`):
- One-off tasks
- Temporary recipes
- Quick experiments

### Configuration Management

**Global Config:**
- Set common defaults (model, temperature)
- Personal preferences
- API keys and credentials

**Local Config:**
- Project-specific settings
- Team standards
- Override global defaults

### File Patterns

**Be Specific:**
```yaml
# Good - specific patterns
$include:
  - "src/**/*.js"
  - "lib/**/*.ts"

# Avoid - too broad
$include:
  - "**/*"
```

**Use Excludes:**
```yaml
$exclude:
  - "**/*.test.js"
  - "node_modules/**"
  - "dist/**"
  - "*.min.js"
```

### Template Design

**Keep Templates Focused:**
- One clear task per template
- Use descriptive property names
- Document expected behavior

**Use Pipes Wisely:**
- Chain operations for clarity
- Use custom pipes for complex logic
- Test pipe chains before using

**Leverage Variables:**
- Define reusable values
- Use context for dynamic content
- Transform data with pipes

---

## Troubleshooting

### Common Issues

**Issue: No .geese files found**
- Check file extension is `.geese`
- Verify files are in expected locations
- Use `geese new` to create template

**Issue: Files not matching patterns**
- Test patterns with `--dry-run`
- Check exclude patterns
- Verify working directory

**Issue: Pipe operation not found**
- Check operation name spelling
- Verify custom pipe is loaded
- Use `--verbose` for debugging

**Issue: Configuration not applied**
- Check configuration hierarchy
- Use `--list --with-sources` to debug
- Verify syntax in config files

---

## Getting Help

### Documentation

- **README.md** - Getting started guide
- **FEATURES_OVERVIEW.md** (this file) - Feature reference
- **docs/features/** - Detailed feature documentation
- **docs/TESTING_GUIDE.md** - Testing methodology

### Commands

```bash
# General help
geese --help

# Command help
geese run --help
geese config --help
geese new --help
```

### Examples

See `examples/` directory for:
- Sample `.geese` files
- Configuration examples
- Custom pipe operations
- Common use cases

---

**Document Owner:** Development Team  
**Last Updated:** 2024-12-03  
**Next Review:** 2025-03-01
