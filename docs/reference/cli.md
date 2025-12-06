# Reference: CLI Commands

This document lists all available commands and flags for the Geese CLI.

## Global Flags

*   `-v, --version`: Output the version number.
*   `-h, --help`: Display help for command.

## `geese run [directory]` (Default)

Runs a Geese task. If no directory is specified, defaults to the current directory.

**Usage:** `geese [options] [directory]`

**Options:**
*   `-f, --file <filename>`: Run a specific `.geese` file directly, skipping interactive selection.
*   `-y, --yes`: Skip confirmation prompts.
*   `--dry-run`: Preview the execution (files matched, prompt generated) without calling the AI tool.
*   `--tool <name>`: Override the AI tool runner (e.g., `aider`, `goose`).

## `geese new <name>`

Creates a new `.geese` template file.

**Usage:** `geese new [options] <name>`

**Options:**
*   `-t, --tool <name>`: Specify the tool runner to generate the template for (default: `goose`).
*   `--wizard`: Run in interactive wizard mode to configure the template.

## `geese config`

Manages configuration settings.

**Usage:** `geese config [options]`

**Options:**
*   `--list`: List all current configuration settings and their values.
*   `--set <key> <value>`: Set a configuration value (saves to global config by default).
*   `--get <key>`: Get a specific configuration value.
*   `--delete <key>`: Remove a configuration value.
*   `--local`: When used with set/delete, applies changes to the local project configuration (`.geese/config.json`) instead of global.

## `geese runner`

Manages custom tool runners.

**Usage:** `geese runner <command>`

**Commands:**
*   `list`: List available runners.
*   `new <name>`: Create a new custom runner.
    *   `-d, --description <text>`: Description of the runner.
    *   `--local`: Create in the local project (`.geese/runners`) instead of global.
*   `remove <name>`: Remove a runner.

## `geese pipe` (Experimental)

Manages custom pipes.

**Usage:** `geese pipe <command>`

**Commands:**
*   `new <name>`: Create a new custom pipe.
*   `list`: List available pipes.
