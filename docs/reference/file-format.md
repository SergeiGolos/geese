# Reference: .geese File Format

The `.geese` file is the core unit of work in Geese. It combines configuration (YAML Frontmatter) with a prompt template (Handlebars).

## File Structure

```handlebars
---
# Frontmatter (YAML)
variable: value
---
# Template (Handlebars)
Content {{variable}}
```

## System Variables (Frontmatter)

Variables starting with `_` control Geese's behavior.

| Variable | Required | Type | Description |
| :--- | :--- | :--- | :--- |
| `_include` | **Yes** | `string[]` | Glob patterns of files to process. |
| `_exclude` | No | `string[]` | Glob patterns of files to ignore. |
| `_recipe` | No | `string` | Task name/recipe identifier passed to the runner. |
| `_tool` | No | `string` | The AI tool runner to use (overrides config). |
| `_model` | No | `string` | AI model to use (e.g., `gpt-4`). |
| `_temperature`| No | `number` | Sampling temperature (0.0 - 1.0). |

## Template Context Variables

These variables are automatically available in the Handlebars template:

| Variable | Description |
| :--- | :--- |
| `{{filename}}` | The relative path of the file being processed. |
| `{{filepath}}` | The absolute path of the file being processed. |
| `{{content}}` | The raw text content of the file. |
| `{{project_root}}` | The root directory of the project. |

## User Variables

Any other variable defined in the frontmatter is available in the template.

```yaml
context: "This is a context variable"
```

Usage: `{{context}}`

## Pipe Syntax

Variables in frontmatter can be processed using pipes.

**Syntax:** `key: "value" ~> pipeName [arg1] [arg2]`

**Order of Operations:**
1.  System variables are processed.
2.  Static values are loaded.
3.  Pipes are executed (Dynamic values).

## Variable Processing Order

1.  **System**: `_include`, `_exclude` are evaluated to find files.
2.  **Per-File Context**: For each matching file, `filename` and `content` are loaded.
3.  **Frontmatter Evaluation**: Pipes are executed.
4.  **Template Rendering**: Handlebars compiles the template with the final context.
