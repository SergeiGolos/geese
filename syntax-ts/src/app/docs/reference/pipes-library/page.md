---
title: "Pipes Library"
nextjs:
  metadata:
    title: "Pipes Library"
    description: "Documentation for Pipes Library"
---

This document lists the built-in pipe operations available in Geese.

## String Operations

| Pipe | Arguments | Description |
| :--- | :--- | :--- |
| `trim` | None | Removes whitespace from both ends of a string. |
| `toUpperCase` | None | Converts string to uppercase. |
| `toLowerCase` | None | Converts string to lowercase. |
| `substring` | `start`, `[end]` | Returns a part of the string. |
| `replace` | `pattern`, `replacement` | Replaces occurrences of a pattern (supports simple strings). |
| `split` | `separator` | Splits string into an array. Default separator is `,`. |
| `join` | `separator` | Joins an array into a string. |

## File Operations

| Pipe | Arguments | Description |
| :--- | :--- | :--- |
| `readFile` | None | Reads the content of a file. Input must be a file path. |
| `readJson` | None | Reads a file and parses it as JSON. |

## JSON/Data Operations

| Pipe | Arguments | Description |
| :--- | :--- | :--- |
| `parseJson` | None | Parses a JSON string into an object. |
| `jqSelect` | `path` | Selects a value from an object using dot notation (e.g., `user.name`). |
| `jqMap` | `path` | Maps over an array of objects and selects a property from each. |

## Utility Operations

| Pipe | Arguments | Description |
| :--- | :--- | :--- |
| `grep` | `pattern` | Filters lines matching a regex pattern. |
| `grepCount` | `pattern` | Returns the count of lines matching a pattern. |
| `count` | None | Returns the length of an array or string. |

## Example Usage

```yaml
# Read a log file and count errors
error_count: "./app.log" ~> readFile ~> grep "ERROR" ~> count

# Get version from package.json
version: "./package.json" ~> readFile ~> parseJson ~> jqSelect "version"
```