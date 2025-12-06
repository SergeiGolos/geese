# How-to: Create Custom Pipe Operations

This guide explains how to extend Geese by creating custom pipe operations. Pipes allow you to transform data within your `.geese` templates using the `~>` syntax.

## Overview

A pipe operation is a class that implements the `IPipeOperation` interface. It takes an input value, optional arguments, and a context object, and returns a transformed value.

## Step 1: Create the Operation Class

Create a file for your operation, e.g., `my-pipes/reverse.js`.

```javascript
const IPipeOperation = require('geese/src/interfaces/pipe-operation'); // Adjust path as needed or mock if strictly external

class ReverseOperation {
  // 1. Define the name used in templates
  getName() {
    return 'reverse';
  }

  // 2. Implement the logic
  execute(value, args, context) {
    if (!value) return value;
    return String(value).split('').reverse().join('');
  }

  // 3. Optional: Validate arguments
  validateArgs(args) {
    return true;
  }
}

module.exports = ReverseOperation;
```

## Step 2: Register the Operation

Currently, Geese scans specific directories or requires manual registration depending on your setup.

To register it globally for your personal use, you can place it in `~/.geese/pipes/`. (Note: Ensure your Geese version supports dynamic loading from this path, or check `geese pipe list`).

*See [Architecture](../explanation/architecture.md) for details on how the PipeRegistry loads operations.*

## Using the Pipe

Once registered, you can use it in your `.geese` file:

```yaml
reversed_name: "{{filename}}" ~> reverse
```

## Advanced: Arguments and Context

The `execute` method receives:
-   `value`: The data piped into the operation.
-   `args`: An array of string arguments passed in the template (e.g., `~> myPipe arg1 arg2`).
-   `context`: An object containing other variables from the template execution.

### Example with Arguments

```javascript
class WrapOperation {
  getName() { return 'wrap'; }

  execute(value, args) {
    const wrapper = args[0] || '*';
    return `${wrapper}${value}${wrapper}`;
  }
}
```

Usage:
```yaml
title: "Hello" ~> wrap "#"
# Result: #Hello#
```

## Best Practices

1.  **Pure Functions**: Pipes should ideally be pure functions (same input = same output) unless they are reading external state (like `readFile`).
2.  **Error Handling**: Throw descriptive errors if inputs are invalid.
3.  **Documentation**: Implement `getMetadata()` to describe your pipe.

```javascript
getMetadata() {
  return {
    name: 'reverse',
    description: 'Reverses a string.',
    example: '"abc" ~> reverse' // Result: "cba"
  };
}
```
