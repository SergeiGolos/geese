---
title: "Config Settings"
nextjs:
  metadata:
    title: "Config Settings"
    description: "Documentation for Config Settings"
---

This document lists all configuration keys available in `config.json` (Global or Local).

## Core Settings

| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `defaultTool` | `string` | `"goose"` | The default AI tool runner to use. |
| `logLevel` | `string` | `"info"` | Logging verbosity (`debug`, `info`, `warn`, `error`). |

## Goose Runner Settings (`goose.*`)

Settings specific to the default `goose` runner.

| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `goose.model` | `string` | `"gpt-4"` | The AI model to use. |
| `goose.temperature` | `number` | `0.7` | Randomness of the output. |
| `goose.max_tokens` | `number` | `2000` | Maximum length of generated response. |
| `goose.include` | `string[]` | `["**/*.js"]` | Default include pattern for new files. |
| `goose.exclude` | `string[]` | `["node_modules/**"]` | Default exclude pattern. |

## Tool-Specific Settings

Any key matching a registered tool name will be passed to that tool's runner.

**Example for a custom tool `aider`:**

```json
{
  "aider": {
    "model": "gpt-3.5-turbo",
    "auto_commits": false
  }
}
```

## Security Settings

| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `security.allowAbsolutePaths` | `boolean` | `true` | Allow accessing files outside project root via pipes. |
| `security.maxFileReadsPerSecond` | `number` | `50` | Rate limit for file reading operations. |