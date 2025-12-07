---
title: "Troubleshoot"
nextjs:
  metadata:
    title: "Troubleshoot"
    description: "Documentation for Troubleshoot"
---

This guide covers common issues and debugging techniques for Geese.

## Debugging Techniques

### 1. Dry Run (`--dry-run`)

The most important tool for debugging is the `--dry-run` flag. It performs all steps (finding files, processing templates, applying pipes) **except** calling the AI tool.

```bash
geese --dry-run
```

This will print:
*   The configuration being used.
*   The list of files matched.
*   The final generated prompt.

### 2. Check Configuration

If settings aren't applying as expected, check the configuration hierarchy:

```bash
geese config --list
```

This shows the resolved value for every setting.

### 3. Verbose Logging

Wait, Geese doesn't strictly have a `--verbose` flag documented yet, but you can check the logs generated in `logs/` for detailed execution info.

## Common Issues

### "No files matched"

*   **Cause**: Your `_include` pattern in the `.geese` file is too restrictive or incorrect.
*   **Fix**:
    *   Check your glob patterns. Remember `**` matches directories recursively.
    *   Run `geese --dry-run` to see what files are being scanned.
    *   Check `_exclude` patterns.

### "goose not found"

*   **Cause**: The default runner is set to `goose`, but the `goose` binary is not in your system PATH.
*   **Fix**:
    *   Install Goose: `npm install -g @block/goose` (or relevant package).
    *   Or, configure the path: `geese config --set goose.path /path/to/goose`.

### "Pipe not found"

*   **Cause**: You used a pipe `~> myPipe` that isn't registered.
*   **Fix**:
    *   Check spelling.
    *   List available pipes: `geese pipe list` (if available) or check documentation.
    *   If it's a custom pipe, ensure it's in the correct directory.

### Handlebars Syntax Errors

*   **Error**: `Parse error on line X...`
*   **Fix**: Check your `.geese` file for unclosed braces `}}` or invalid syntax.

## Reporting Bugs

If you find a bug, please check the [GitHub Issues](https://github.com/block/geese/issues) page. Include:
1.  Your OS and Node version.
2.  The command you ran.
3.  The content of your `.geese` file (redacted if private).
4.  The output of `--dry-run`.