# 🔧 Pipe Operations Guide

## Overview

Pipe operations in Geese allow you to transform property values in `.geese` files using a Unix-like pipeline syntax with the `~>` operator. This enables powerful data manipulation directly in your configuration files.

## Basic Syntax

```yaml
property_name: "initial value" ~> operation1 ~> operation2 arg1 arg2
```

Operations are executed left-to-right, with each operation receiving the output of the previous one.

## How It Works

1. **Initial Value**: The value before the first `~>` is the starting point
2. **Pipe Operator**: `~>` separates operations in the chain
3. **Operations**: Each operation can take arguments separated by spaces
4. **Chaining**: Output of one operation becomes input to the next
5. **Result**: Final output is stored in the property

## Visual Distinction: System vs User Properties

### System Properties ($ prefix)
System properties control Geese behavior and are parsed once:

```yaml
$include:
  - "src/**/*.js"
$exclude:
  - "*.test.js"
$recipe: "code-review"
$temperature: 0.7
```

### User Properties (no prefix)
User properties become template variables and **support pipe operations**:

```yaml
# Simple values
project_name: "My Project"
author: "John Doe"

# With pipe operations
formatted_title: "code review" ~> toUpperCase
processed_data: "a,b,c" ~> split , ~> join " | "
```

## Built-in Operations

### String Operations

#### `trim`
Remove whitespace from both ends of a string.

```yaml
clean_text: "  hello world  " ~> trim
# Result: "hello world"
```

#### `substring start [end]`
Extract a portion of the string.

```yaml
short_title: "Very Long Title Here" ~> substring 0 10
# Result: "Very Long "

rest_of_string: "Hello World" ~> substring 6
# Result: "World"
```

#### `toUpperCase`
Convert string to uppercase.

```yaml
shouting: "hello" ~> toUpperCase
# Result: "HELLO"
```

#### `toLowerCase`
Convert string to lowercase.

```yaml
whisper: "HELLO" ~> toLowerCase
# Result: "hello"
```

#### `replace pattern replacement`
Replace all occurrences of a pattern.

```yaml
formatted: "hello world" ~> replace " " "-"
# Result: "hello-world"

cleaned: "test@example.com" ~> replace "@" " at "
# Result: "test at example.com"
```

#### `split separator`
Split string into an array.

```yaml
items: "apple,banana,orange" ~> split ,
# Result: ["apple", "banana", "orange"]

words: "hello world" ~> split " "
# Result: ["hello", "world"]
```

#### `join separator`
Join array elements into a string.

```yaml
list: "a,b,c" ~> split , ~> join " | "
# Result: "a | b | c"
```

### File Operations

#### `readFile [encoding]`
Read content from a file. Path is relative to the `.geese` file location.

```yaml
changelog: "./CHANGELOG.md" ~> readFile
# Result: contents of CHANGELOG.md

binary_data: "./data.bin" ~> readFile base64
# Result: base64-encoded content
```

#### `loadFile [encoding]`
Alias for `readFile`.

```yaml
template: "./template.txt" ~> loadFile
```

### List Operations

#### `filter pattern`
Filter array elements by regex pattern.

```yaml
js_files: "app.js,style.css,main.js,index.html" ~> split , ~> filter "\.js$"
# Result: ["app.js", "main.js"]
```

#### `map property`
Extract a property from objects in an array.

```yaml
# Assuming array of objects
names: '[{"name":"John"},{"name":"Jane"}]' ~> parseJson ~> map name
# Result: ["John", "Jane"]
```

#### `select index`
Get item at specific index.

```yaml
second_item: "a,b,c,d" ~> split , ~> select 1
# Result: "b"
```

#### `first`
Get the first element of an array.

```yaml
first_word: "hello world foo" ~> split " " ~> first
# Result: "hello"
```

#### `last`
Get the last element of an array.

```yaml
last_word: "hello world foo" ~> split " " ~> last
# Result: "foo"
```

#### `length`
Get the length of an array or string.

```yaml
word_count: "hello world" ~> split " " ~> length
# Result: 2

char_count: "hello" ~> length
# Result: 5
```

### Type Operations

#### `parseJson`
Parse a JSON string.

```yaml
data: '{"name":"John","age":30}' ~> parseJson
# Result: {name: "John", age: 30}
```

#### `stringify [indent]`
Convert value to JSON string.

```yaml
json_text: '{"name":"John"}' ~> parseJson ~> stringify 2
# Result: formatted JSON string
```

#### `parseYaml`
Parse simple YAML format.

```yaml
config: "name: John\nage: 30" ~> parseYaml
# Result: {name: "John", age: "30"}
```

#### `parseInt [radix]`
Parse string to integer.

```yaml
number: "42" ~> parseInt
# Result: 42

hex_number: "FF" ~> parseInt 16
# Result: 255
```

#### `parseFloat`
Parse string to floating point number.

```yaml
decimal: "3.14" ~> parseFloat
# Result: 3.14
```

### Regex Operations

#### `match pattern [flags]`
Match regex pattern and return matches.

```yaml
numbers: "test123and456" ~> match "\d+" g
# Result: ["123", "456"]
```

#### `test pattern [flags]`
Test if pattern matches (returns true/false).

```yaml
has_numbers: "test123" ~> test "\d+"
# Result: true
```

### Utility Operations

#### `default fallback`
Use fallback value if input is empty/null.

```yaml
user_input: "" ~> default "No input provided"
# Result: "No input provided"

user_input: "Something" ~> default "No input provided"
# Result: "Something"
```

#### `echo`
Debug operation that prints value to console and returns it unchanged.

```yaml
debug_value: "test" ~> echo ~> toUpperCase
# Prints: [PIPE DEBUG] test
# Result: "TEST"
```

## Complex Examples

### Example 1: Format Report Title
```yaml
report_title: "code review for main module" ~> toUpperCase ~> replace " " "_"
# Result: "CODE_REVIEW_FOR_MAIN_MODULE"
```

### Example 2: Process File List
```yaml
files: "app.js,test.js,main.js,spec.js" ~> split , ~> filter "^(?!.*spec|.*test)" ~> join ", "
# Result: "app.js, main.js"
```

### Example 3: Load and Process Data
```yaml
data_summary: "./data.json" ~> readFile ~> parseJson ~> stringify 0 ~> substring 0 100
# Loads JSON file, parses it, stringifies without indent, takes first 100 chars
```

### Example 4: Conditional Value
```yaml
user_name: "" ~> default "Anonymous" ~> toUpperCase
# Result: "ANONYMOUS"

user_name: "John" ~> default "Anonymous" ~> toUpperCase
# Result: "JOHN"
```

### Example 5: Complex String Manipulation
```yaml
slug: "  Hello World - A Great Title!  " ~> trim ~> toLowerCase ~> replace "[^a-z0-9 ]" "" ~> replace " " "-"
# Result: "hello-world--a-great-title"
```

## Creating Custom Pipe Operations

### Create a New Pipe

```bash
geese pipe new myOperation -d "Description of what it does"
```

This creates a file in `~/.geese/pipes/myOperation.js`:

```javascript
/**
 * Custom Pipe Operation: myOperation
 * Description of what it does
 */

module.exports = function myOperation(value, args, context) {
  // value: input from previous operation
  // args: array of arguments
  // context: object with all properties
  
  // Your implementation here
  return transformedValue;
};
```

### Custom Pipe Examples

#### Example 1: Reverse String

```javascript
// ~/.geese/pipes/reverse.js
module.exports = function reverse(value, args, context) {
  return String(value).split('').reverse().join('');
};
```

Usage:
```yaml
reversed: "hello" ~> reverse
# Result: "olleh"
```

#### Example 2: Repeat String

```javascript
// ~/.geese/pipes/repeat.js
module.exports = function repeat(value, args, context) {
  const times = parseInt(args[0] || '1', 10);
  return String(value).repeat(times);
};
```

Usage:
```yaml
repeated: "ha" ~> repeat 3
# Result: "hahaha"
```

#### Example 3: Get from Context

```javascript
// ~/.geese/pipes/getContext.js
module.exports = function getContext(value, args, context) {
  const key = args[0] || value;
  return context[key] || '';
};
```

Usage:
```yaml
file: "filename" ~> getContext
# Gets the filename property from context
```

#### Example 4: Format Date

```javascript
// ~/.geese/pipes/formatDate.js
module.exports = function formatDate(value, args, context) {
  const date = new Date(value);
  const format = args[0] || 'YYYY-MM-DD';
  
  // Simple date formatting
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day);
};
```

Usage:
```yaml
formatted_date: "2024-01-15T10:30:00Z" ~> formatDate "MM/DD/YYYY"
# Result: "01/15/2024"
```

### Pipe Function Signature

```typescript
function pipeName(
  value: any,        // Input value from previous operation
  args: string[],    // Arguments passed to the operation
  context: any       // Full context with all properties
): any               // Return transformed value
```

**Context Object:**
The context object contains:
- All user properties (after previous pipes are executed)
- `filename`: Name of the target file
- `filepath`: Full path to target file
- `content`: Content of the target file
- `geese_file`: Name of the .geese file
- `_geeseFileDir`: Directory of the .geese file (for relative paths)
- `_gooseConfig`: System configuration

## Managing Custom Pipes

### List Available Pipes
```bash
geese pipe list
```

Shows all built-in and custom operations.

### Remove a Custom Pipe
```bash
geese pipe remove myOperation
```

Deletes the pipe file from `~/.geese/pipes/`.

### Show Help
```bash
geese pipe help
```

Displays comprehensive help about pipe operations.

## Best Practices

### 1. Keep Operations Simple
Each operation should do one thing well:
```yaml
# Good: Clear chain of simple operations
title: "hello world" ~> trim ~> toUpperCase ~> replace " " "-"

# Avoid: Complex logic in a single custom operation
```

### 2. Use Descriptive Property Names
```yaml
# Good
formatted_review_title: "code review" ~> toUpperCase

# Less clear
title1: "code review" ~> toUpperCase
```

### 3. No Manual Quoting Needed
```yaml
# Pipe expressions are automatically quoted by the parser
# Just write naturally:
formatted: "hello" ~> trim ~> toUpperCase
title: "code review" ~> toUpperCase ~> replace " " "-"
list: "a,b,c" ~> split , ~> join " | "
```

### 4. Chain Wisely
```yaml
# Good: Logical sequence
text: "  hello  " ~> trim ~> toUpperCase ~> substring 0 3

# Less efficient: Unnecessary operations
text: "  hello  " ~> toUpperCase ~> trim ~> toLowerCase ~> toUpperCase
```

### 5. Use Default for Safety
```yaml
# Provide fallbacks for potentially empty values
user_input: "" ~> default "Not provided"
config_value: "" ~> default "development"
```

### 6. Debug with Echo
```yaml
# Add echo to see intermediate values
result: "test" ~> echo ~> toUpperCase ~> echo ~> substring 0 2
# Console will show: test, TEST
```

## Common Patterns

### Pattern 1: Format Identifiers
```yaml
identifier: "My Project Name" ~> toLowerCase ~> replace " " "_"
# my_project_name
```

### Pattern 2: Clean User Input
```yaml
clean_input: "  User Input!  " ~> trim ~> default "No input"
```

### Pattern 3: Process List Data
```yaml
tags: "javascript, typescript, node.js" ~> split , ~> map trim ~> join " | "
# javascript | typescript | node.js
```

### Pattern 4: Load External Data
```yaml
readme_preview: "./README.md" ~> readFile ~> substring 0 500 ~> trim
```

### Pattern 5: Conditional Formatting
```yaml
status: "" ~> default "pending" ~> toUpperCase
# PENDING
```

## Troubleshooting

### Issue: Operation Not Found
```
Error: Pipe operation "myOp" not found
```
**Solution:** Check spelling or create the operation with `geese pipe new myOp`

### Issue: Wrong Number of Arguments
```
Error: replace operation requires 2 arguments
```
**Solution:** Ensure you provide all required arguments: `replace pattern replacement`

### Issue: YAML Parse Error
```
Error: end of the stream or a document separator is expected
```
**Solution:** This should not occur with the current parser as pipe expressions are automatically quoted. If you encounter this, ensure your .geese file has proper YAML formatting.

### Issue: File Not Found
```
Error: File not found: ./data.txt
```
**Solution:** Check that the path is relative to the `.geese` file location

## Performance Considerations

- Pipe operations are executed for each target file
- File operations (`readFile`) are synchronous - use sparingly
- Complex regex patterns may slow down processing
- Custom pipes have access to full context - be mindful of memory

## Backward Compatibility

The `@` prefix is automatically converted to `$` prefix:

```yaml
# Old format (still works)
@include:
  - "*.js"
@recipe: "test"

# New format (recommended)
$include:
  - "*.js"
$recipe: "test"
```

## Summary

Pipe operations provide a powerful, declarative way to transform data in your `.geese` files:

- 🔗 **Chain operations** with the `~>` operator
- 🎨 **Visual distinction** between system ($) and user properties
- 🔧 **Built-in operations** for common transformations
- 🎯 **Custom operations** for specialized needs
- 📝 **Clean syntax** inspired by Unix pipelines
- 🚀 **Executed per file** for dynamic contexts

Use them to keep your `.geese` files DRY and maintainable!
