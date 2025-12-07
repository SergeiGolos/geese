---
title: "Creating Templates"
nextjs:
  metadata:
    title: "Creating Templates"
    description: "Documentation for Creating Templates"
---

This tutorial explains how to create effective `.geese` templates using Handlebars, Frontmatter variables, and Pipes.

## Anatomy of a `.geese` File

A `.geese` file has two parts:
1.  **YAML Frontmatter**: Configuration and variables (between `---` lines).
2.  **Handlebars Template**: The prompt sent to the AI.

```yaml
---
_include: ["src/**/*.js"]
_recipe: "explain-code"
complexity_level: "beginner"
lines_of_code: "{{content}}" ~> split "\n" ~> count
---
Explain this code to a {{complexity_level}}.
It has {{lines_of_code}} lines.

Code:
{{content}}
```

## Step 1: Define Scope with System Variables

System variables start with `_` and tell Geese *how* to process files.

*   `_include`: (Required) List of glob patterns to match files.
*   `_exclude`: List of patterns to ignore.
*   `_recipe`: A label for the task (often used by the runner).

```yaml
_include:
  - "src/components/**/*.jsx"
_exclude:
  - "**/*.test.jsx"
```

## Step 2: Define Custom Variables

You can define your own variables to make the prompt dynamic.

```yaml
review_type: "security audit"
priority: "high"
```

These can be used in the template as `{{review_type}}` and `{{priority}}`.

## Step 3: Transform Data with Pipes

Pipes allow you to process data before it hits the template. The syntax is `"value" ~> pipeName argument`.

Example: calculating the number of lines in a file.

```yaml
line_count: "{{content}}" ~> split "\n" ~> count
```

You can chain pipes:

```yaml
# Read a config file, parse it, and select a value
app_version: "./package.json" ~> readFile ~> parseJson ~> jqSelect version
```

## Step 4: Write the Prompt Template

The body of the file is a Handlebars template. You have access to:
-   All frontmatter variables.
-   `{{filename}}`: The relative path of the file being processed.
-   `{{content}}`: The raw content of the file.

```handlebars
Analyze the file {{filename}}.
Version: {{app_version}}

{{content}}
```

## Step 5: Conditional Logic

Handlebars supports logic like `{{#if}}` and `{{#each}}`.

```handlebars
{{#if (eq priority "high")}}
URGENT ATTENTION REQUIRED.
{{/if}}
```

## Summary

1.  Use **Frontmatter** to define scope (`_include`) and data.
2.  Use **Pipes** (`~>`) to transform data or read external files.
3.  Use **Handlebars** (`{{ }}`) to structure the prompt.

Next, learn about all available [Built-in Pipes](../reference/pipes-library.md).