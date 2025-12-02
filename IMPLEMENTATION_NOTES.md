# Implementation Notes: Pipe Operations System

## Overview

This document captures key implementation details and design decisions for the pipe operations system in Geese.

## Architecture Decisions

### 1. System vs User Properties ($ Prefix)

**Decision:** Use `$` prefix to visually distinguish system properties from user properties.

**Rationale:**
- System properties (`$include`, `$exclude`, `$recipe`, etc.) control Geese behavior and are parsed once per .geese file
- User properties (no prefix) become template variables and support pipe operations
- Clear visual distinction helps developers understand the file structure
- Prevents confusion about which properties support pipe operations

**Implementation:**
```javascript
// src/geese-parser.js:7-11
const SYSTEM_PROPERTIES = [
  '$include', '$exclude', '$recipe', '$model', 
  '$temperature', '$max_tokens', '$flags'
];
```

**Example:**
```yaml
# System properties with $ prefix
$include:
  - "src/**/*.js"
$recipe: "code-review"

# User properties (support pipes)
project_name: "My Project"
formatted: '"text" ~> toUpperCase'
```

### 2. Backward Compatibility (@ Prefix)

**Decision:** Automatically convert `@` prefix to `$` prefix for backward compatibility.

**Rationale:**
- Existing .geese files used `@` prefix
- Smooth migration path for users
- No breaking changes

**Implementation:**
```javascript
// src/geese-parser.js:36-37
fileContent = fileContent.replace(/^(\s*)@(include|exclude|recipe|model|temperature|max_tokens|flags):/gm, '$1$$$2:');
```

### 3. Pipe Operation Signature

**Decision:** Use signature `(value: any, args: string[], context: any) => any`

**Rationale:**
- `value`: Output from previous operation (chain-able)
- `args`: Flexible argument passing
- `context`: Access to all properties for context-aware operations
- Return type `any` supports complex data types

**Implementation:**
```javascript
// src/pipe-operations.js
module.exports = function operationName(value, args, context) {
  // Transform value based on args and context
  return transformedValue;
};
```

### 4. Auto-Quoting for Pipe Operations

**Decision:** Automatically quote pipe operations during preprocessing.

**Rationale:**
- YAML can have issues with `~>` operator in certain contexts
- Manual quoting is tedious and error-prone for users
- Preprocessing transparently handles quoting
- Users can write natural syntax: `key: "value" ~> operation`

**Implementation:**
The parser preprocesses frontmatter before YAML parsing:
- Detects lines with `~>` operator
- Checks if the value is already fully quoted
- Wraps unquoted pipe expressions in single quotes
- Escapes any single quotes in the value (YAML style: `''`)

**Example:**
```yaml
# User writes (natural syntax):
my_value: "hello" ~> trim ~> toUpperCase

# Parser auto-converts to (valid YAML):
my_value: '"hello" ~> trim ~> toUpperCase'
```

## Key Implementation Details

### Argument Parsing

The argument parser handles:
- Quoted strings: `"arg with spaces"`
- Escaped quotes: `"arg with \" quote"`
- Empty strings: `""`
- Multiple arguments: `op arg1 arg2 "arg 3"`

**Implementation:** `src/pipe-operations.js:76-119`

### Error Handling

- Invalid operation names throw clear errors
- Missing required arguments are caught
- File not found errors include full path
- Type conversion errors are handled gracefully

### Custom Pipes

Custom pipes are stored in `~/.geese/pipes/` and:
- Automatically loaded when geese runs
- Can access full context
- Follow same signature as built-in operations
- Can be managed via CLI (`geese pipe new/list/remove`)

## Testing Strategy

### Test Coverage
- 44 total tests (11 CLI + 33 pipe tests)
- Unit tests for each built-in operation
- Integration tests for parser
- Cross-platform compatibility tests

### Test Files
- `test-cli.js`: Original CLI tests
- `test-pipes.js`: Pipe operations tests

### Key Test Cases
1. Individual operation behavior
2. Pipe chain execution
3. Argument parsing with quotes
4. Parser integration
5. $ prefix handling
6. @ prefix backward compatibility
7. File operations with relative paths
8. Cross-platform path handling

## Performance Considerations

1. **Per-File Execution:** Pipes are executed for each target file, allowing file-specific context
2. **Synchronous Operations:** File operations are synchronous to maintain simplicity
3. **Operation Registry:** Map-based registry provides O(1) operation lookup
4. **Lazy Loading:** Custom pipes loaded once at startup

## Security Considerations

1. **File Access:** `readFile` operations are restricted to relative paths from .geese file location
2. **Code Execution:** Custom pipes use Node's require, which is safe for local files
3. **Argument Injection:** Arguments are parsed and passed as strings, preventing code injection
4. **Context Isolation:** Each file gets its own context object

## Future Extensibility

### Potential Enhancements
1. Async pipe operations for heavy I/O
2. Pipe operation composition/aliases
3. Built-in validation operations
4. HTTP request operations
5. Database query operations
6. Template/macro operations

### Architecture Support
The current design supports:
- Adding new built-in operations easily
- Plugin system for external operation packages
- Operation versioning
- Operation documentation/help system

## Common Patterns

### Pattern: Format Identifiers
```yaml
identifier: '"My Project Name" ~> toLowerCase ~> replace " " "_"'
# Result: "my_project_name"
```

### Pattern: Clean User Input
```yaml
clean_input: '"  User Input!  " ~> trim ~> default "No input"'
```

### Pattern: Process Lists
```yaml
tags: '"js,ts,jsx,tsx" ~> split , ~> join " | "'
# Result: "js | ts | jsx | tsx"
```

### Pattern: Load External Data
```yaml
readme: '"./README.md" ~> readFile ~> substring 0 500'
```

## Migration Guide

### From Old Format to New Format

**Old (.geese file with @ prefix):**
```yaml
---
@include:
  - "src/**/*.js"
@recipe: "code-review"
project_name: "My Project"
---
```

**New (recommended with $ prefix):**
```yaml
---
$include:
  - "src/**/*.js"
$recipe: "code-review"
project_name: "My Project"
---
```

**With Pipes:**
```yaml
---
$include:
  - "src/**/*.js"
$recipe: "code-review"
project_name: '"  My Project  " ~> trim'
formatted: '"title" ~> toUpperCase'
---
```

## Troubleshooting

### Common Issues

**Issue:** YAML parse error with pipes
```
Error: end of the stream or a document separator is expected
```
**Solution:** Quote the entire value: `key: '"value" ~> operation'`

**Issue:** Operation not found
```
Error: Pipe operation "myOp" not found
```
**Solution:** Check spelling or create with `geese pipe new myOp`

**Issue:** File not found in readFile
```
Error: File not found: ./data.txt
```
**Solution:** Ensure path is relative to .geese file location

## References

- Main parser implementation: `src/geese-parser.js`
- Pipe operations registry: `src/pipe-operations.js`
- CLI implementation: `src/pipe-cli.js`
- User documentation: `PIPE_OPERATIONS.md`
- Examples: `examples/pipe-operations-demo.geese`
- Tests: `test-pipes.js`

## Version History

- **v1.0.0:** Initial implementation with 24 built-in operations
- Support for custom operations via CLI
- Full backward compatibility with @ prefix
- Cross-platform support

---

**Last Updated:** 2024-12-02
**Authors:** Copilot Workspace Agent
