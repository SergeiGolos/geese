---
title: "Pipe Operations"
nextjs:
  metadata:
    title: "Pipe Operations"
    description: "Documentation for Pipe Operations"
---

**Version:** 1.0.0
**Last Updated:** 2024-12-03

Pipe operations in Geese allow you to transform property values using a Unix-like pipeline syntax. This feature enables powerful data manipulation directly in your `.geese` configuration files.

---

## Quick Start

### Basic Syntax

```yaml
property_name: "initial value" ~> operation1 ~> operation2 arg1 arg2
```

- `~>` is the pipe operator that chains operations
- Operations execute left-to-right
- Each operation receives the output of the previous one
- Arguments are separated by spaces

### Simple Example

```yaml
greeting: "hello world" ~> toUpperCase ~> trim
# Result: "HELLO WORLD"
```

---

## System vs User Properties

### System Properties ($ prefix)

System properties control Geese behavior and are **not** processed through pipes:

```yaml
$include:
  - "src/**/*.js"
$exclude:
  - "*.test.js"
$recipe: "code-review"
$model: "gpt-4"
$temperature: 0.7
```

### User Properties (no prefix)

User properties become template variables and **support pipe operations**:

```yaml
# Simple values
project_name: My Project
author: John Doe

# With pipe operations
formatted_title: "code review" ~> toUpperCase
processed_data: "a,b,c" ~> split , ~> join " | "
file_contents: "" ~> readFile README.md
```

---

## Built-in Operations

### String Operations

**trim** - Remove leading/trailing whitespace
```yaml
cleaned: "  hello  " ~> trim
# Result: "hello"
```

**toUpperCase** - Convert to uppercase
```yaml
loud: "hello" ~> toUpperCase
# Result: "HELLO"
```

**toLowerCase** - Convert to lowercase
```yaml
quiet: "HELLO" ~> toLowerCase
# Result: "hello"
```

**substring** - Extract substring
```yaml
short: "hello world" ~> substring 0 5
# Result: "hello"

from_middle: "hello world" ~> substring 6
# Result: "world"
```

**replace** - Replace pattern with value
```yaml
updated: "foo bar foo" ~> replace foo baz
# Result: "baz bar baz"

# Regex replace
cleaned: "test123" ~> replace \d+ ""
# Result: "test"
```

**split** - Split string into array
```yaml
parts: "a,b,c" ~> split ,
# Result: ["a", "b", "c"]
```

**join** - Join array into string
```yaml
combined: ["a", "b", "c"] ~> join ", "
# Result: "a, b, c"
```

---

### List Operations

**first** - Get first element
```yaml
head: "a,b,c" ~> split , ~> first
# Result: "a"
```

**last** - Get last element
```yaml
tail: "a,b,c" ~> split , ~> last
# Result: "c"
```

**filter** - Filter array elements
```yaml
# Greater than comparison
large: "1,2,3,4,5" ~> split , ~> filter >3
# Result: ["4", "5"]

# Less than comparison
small: "1,2,3,4,5" ~> split , ~> filter <3
# Result: ["1", "2"]

# Equality comparison
exact: "1,2,3,2,1" ~> split , ~> filter =2
# Result: ["2", "2"]
```

**map** - Transform array elements
```yaml
# Apply operation to each element
uppercased: "a,b,c" ~> split , ~> map toUpperCase ~> join ,
# Result: "A,B,C"
```

**sort** - Sort array elements
```yaml
ordered: "3,1,2" ~> split , ~> sort
# Result: ["1", "2", "3"]

descending: "1,2,3" ~> split , ~> sort desc
# Result: ["3", "2", "1"]
```

---

### File Operations

**readFile** - Read file contents
```yaml
readme: "" ~> readFile README.md
# Reads and returns file contents

docs: "" ~> readFile docs/guide.md
# Reads file with relative path
```

**loadFile** - Read and parse file (JSON/YAML)
```yaml
# JSON file
config: "" ~> loadFile config.json
# Returns parsed JSON object

# YAML file
settings: "" ~> loadFile settings.yaml
# Returns parsed YAML object
```

**Security:** File operations are rate-limited (50 reads/second) and validate paths to prevent directory traversal attacks.

---

### Type Operations

**parseJson** - Parse JSON string
```yaml
data: '{"name":"John","age":30}' ~> parseJson
# Returns: { name: "John", age: 30 }
```

**stringify** - Convert to JSON string
```yaml
json_string: "{{object}}" ~> stringify
# Returns JSON string representation
```

**toNumber** - Convert to number
```yaml
count: "42" ~> toNumber
# Result: 42

float_val: "3.14" ~> toNumber
# Result: 3.14
```

---

### Regex Operations

**match** - Match regex pattern
```yaml
# Extract domain from email
domain: "user@example.com" ~> match @(.+)$ ~> first
# Result: "example.com"

# Extract all numbers
numbers: "abc123def456" ~> match \d+
# Result: ["123", "456"]
```

**test** - Test if pattern matches
```yaml
is_email: "test@example.com" ~> test @.*\.com$
# Result: true

is_valid: "invalid" ~> test @.*\.com$
# Result: false
```

---

### Utility Operations

**default** - Provide default value if empty
```yaml
name: "" ~> default "Anonymous"
# Result: "Anonymous"

name: "John" ~> default "Anonymous"
# Result: "John" (original value used)
```

**echo** - Output value to console and return it
```yaml
debug: "test value" ~> echo
# Prints "test value" to console
# Returns "test value"
```

---

## Advanced Examples

### Chaining Multiple Operations

```yaml
# Clean and format text
title: "  hello world  " ~> trim ~> toUpperCase ~> replace HELLO Hi
# Result: "Hi WORLD"

# Process CSV data
names: "john,jane,bob" ~> split , ~> map toUpperCase ~> sort ~> join ", "
# Result: "BOB, JANE, JOHN"

# Extract and format
email_domain: "user@example.com" ~> match @(.+)$ ~> first ~> toUpperCase
# Result: "EXAMPLE.COM"
```

### Working with Files

```yaml
# Load and process configuration
config_value: "" ~> loadFile config.json ~> stringify ~> toUpperCase

# Read file and extract information
readme_first_line: "" ~> readFile README.md ~> split \n ~> first ~> trim

# Load YAML and access nested value
db_host: "" ~> loadFile settings.yaml ~> stringify ~> parseJson
```

### Using Context Variables

```yaml
# Define variables
project_name: "My Project"
author_name: "John Doe"

# Use in template variables
greeting: "Welcome to {{project_name}}" ~> toUpperCase
# Result: "WELCOME TO MY PROJECT"

signature: "Created by {{author_name}}" ~> replace John Jane
# Result: "Created by Jane Doe"
```

### Conditional Logic with Filter

```yaml
# Filter large numbers
large_numbers: "5,10,15,20,25" ~> split , ~> filter >15 ~> join ,
# Result: "20,25"

# Get valid entries
valid: "1,2,3,4,5" ~> split , ~> filter >0 ~> filter <5 ~> join ,
# Result: "1,2,3,4"
```

---

## Custom Pipe Operations

You can create your own pipe operations and place them in:

### Global Custom Pipes

Location: `~/.geese/pipes/*.js`

These are available across all projects.

**Example: `~/.geese/pipes/reverse.js`**
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

### Local Custom Pipes

Location: `./.geese/pipes/*.js`

These are available only in the current project and override global pipes with the same name.

**Example: `./.geese/pipes/capitalize.js`**
```javascript
/**
 * Capitalizes first letter of each word
 */
function capitalize(value, args, context) {
  return String(value)
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

module.exports = capitalize;
```

**Usage:**
```yaml
title: "hello world" ~> capitalize
# Result: "Hello World"
```

### Pipe Inheritance

When multiple pipes have the same name, priority is:

1. **Local custom pipes** (`./.geese/pipes/`) - Highest priority
2. **Global custom pipes** (`~/.geese/pipes/`)
3. **Built-in operations** - Lowest priority

This allows you to override built-in operations or customize behavior per project.

---

## Error Handling

### Invalid Operations

```yaml
# Non-existent operation
bad: "test" ~> nonExistentOp
# Error: Unknown pipe operation: nonExistentOp
```

### Invalid Arguments

```yaml
# Wrong argument type
bad: "test" ~> substring abc def
# Error: Invalid arguments for substring
```

### File Not Found

```yaml
# Missing file
content: "" ~> readFile missing.txt
# Error: File not found: missing.txt
```

### Rate Limit Exceeded

```yaml
# Too many file operations
# Error: Rate limit exceeded for file operations (max 50/second)
```

---

## Best Practices

### Keep Pipes Simple

```yaml
# Good - clear and readable
name: "john doe" ~> toUpperCase ~> trim

# Avoid - too complex
data: "a,b,c" ~> split , ~> filter >0 ~> map toUpperCase ~> sort desc ~> join | ~> replace | " - "
# Consider breaking into multiple properties
```

### Use Meaningful Names

```yaml
# Good
formatted_author_name: "{{author}}" ~> toUpperCase
file_extension: "{{filename}}" ~> match \.[^.]+$ ~> first

# Avoid
temp1: "{{author}}" ~> toUpperCase
x: "{{filename}}" ~> match \.[^.]+$ ~> first
```

### Test Your Pipes

Use `--dry-run` to test pipe operations before running:

```bash
geese run --dry-run
```

This shows you the processed values without executing the AI tool.

### Document Custom Pipes

Add JSDoc comments to custom pipe functions:

```javascript
/**
 * Converts text to title case
 * @param {string} value - Input text
 * @param {Array} args - Operation arguments (unused)
 * @param {Object} context - Template context (unused)
 * @returns {string} Title-cased text
 *
 * @example
 * // In .geese file:
 * // title: "hello world" ~> titleCase
 * // Result: "Hello World"
 */
function titleCase(value, args, context) {
  // implementation
}
```

---

## Troubleshooting

### Pipe Not Working

1. Check operation name spelling
2. Verify operation is loaded (custom pipes)
3. Check arguments syntax
4. Use `echo` to debug intermediate values

```yaml
# Debug with echo
debug: "test" ~> echo ~> toUpperCase ~> echo
# Will print value before and after toUpperCase
```

### Custom Pipe Not Found

1. Verify file location (`~/.geese/pipes/` or `./.geese/pipes/`)
2. Check file name matches operation name
3. Ensure file exports a function
4. Restart if pipes were just added

### Unexpected Results

1. Test each operation individually
2. Check input/output types
3. Verify operation order
4. Use `--dry-run` to see processed values

---

## Performance Considerations

### File Operations

File operations (`readFile`, `loadFile`) are rate-limited to 50 operations per second to prevent resource exhaustion.

**Recommendations:**
- Cache file contents if used multiple times
- Avoid reading large files unnecessarily
- Use filters to limit processing

### Complex Chains

Very long pipe chains can impact performance:

```yaml
# If performance is an issue, consider custom pipe
complex: "data" ~> op1 ~> op2 ~> op3 ~> op4 ~> op5 ~> op6
```

**Better:**
Create a custom pipe that combines the operations:

```javascript
// .geese/pipes/processData.js
function processData(value, args, context) {
  // Combine multiple operations efficiently
  return value; // processed result
}
```

---

## Related Documentation

- **FEATURES_OVERVIEW.md** - Complete feature reference
- **configuration-and-pipe-inheritance.md** - Configuration hierarchy details
- **docs/CUSTOM_PIPE_OPERATIONS.md** - Advanced custom pipe development
- **TESTING_GUIDE.md** - Testing pipe operations

---

**Document Owner:** Development Team
**Last Updated:** 2024-12-03
**Next Review:** 2025-03-01