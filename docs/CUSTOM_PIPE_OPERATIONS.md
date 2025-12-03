# Custom Pipe Operations Guide

This guide explains how to create custom pipe operations using the Strategy Pattern with the `IPipeOperation` interface.

## Table of Contents

1. [Overview](#overview)
2. [The IPipeOperation Interface](#the-ipoperation-interface)
3. [Creating a Simple Operation](#creating-a-simple-operation)
4. [Creating an Advanced Operation](#creating-an-advanced-operation)
5. [Registering Custom Operations](#registering-custom-operations)
6. [Best Practices](#best-practices)
7. [Testing Custom Operations](#testing-custom-operations)

## Overview

Pipe operations allow you to transform values in `.geese` file templates. By using the Strategy Pattern with the `IPipeOperation` interface, you can create well-structured, testable, and reusable operations.

### Benefits of Using IPipeOperation

- **Type Safety**: Enforces implementation of required methods
- **Documentation**: Built-in metadata support for help and documentation
- **Validation**: Optional argument validation
- **Testability**: Easy to unit test in isolation
- **Reusability**: Can be shared across projects
- **Consistency**: Follows a standard pattern

## The IPipeOperation Interface

The `IPipeOperation` interface defines the contract for all pipe operations:

```javascript
class IPipeOperation {
  // Required: Return the operation name
  getName() { throw new Error('must be implemented'); }
  
  // Required: Execute the operation
  execute(value, args, context) { throw new Error('must be implemented'); }
  
  // Optional: Validate arguments (default: accepts any args)
  validateArgs(args) { return true; }
  
  // Optional: Provide metadata for documentation
  getMetadata() { return { name, description, examples, args }; }
}
```

### Method Details

#### `getName()` - Required

Returns the name used to invoke this operation in pipe chains.

```javascript
getName() {
  return 'trim'; // Used as: {{ value | trim }}
}
```

#### `execute(value, args, context)` - Required

Performs the transformation.

**Parameters:**
- `value` (any): The input value to transform
- `args` (string[]): Arguments passed to the operation
- `context` (Object): Execution context with additional data

**Returns:** The transformed value

```javascript
execute(value, args, context) {
  return String(value).trim();
}
```

#### `validateArgs(args)` - Optional

Validates operation arguments before execution.

**Parameters:**
- `args` (string[]): Arguments to validate

**Returns:** `true` if valid, `false` otherwise

```javascript
validateArgs(args) {
  if (args.length !== 1) {
    console.warn('Operation requires exactly one argument');
    return false;
  }
  return true;
}
```

#### `getMetadata()` - Optional

Provides documentation and help information.

**Returns:** Object with:
- `name` (string): Operation name
- `description` (string): What the operation does
- `examples` (string[]): Usage examples
- `args` (Array): Argument specifications

```javascript
getMetadata() {
  return {
    name: 'trim',
    description: 'Remove whitespace from both ends of a string',
    examples: ['{{ "  hello  " | trim }}  → "hello"'],
    args: []
  };
}
```

## Creating a Simple Operation

Here's a complete example of a simple operation:

```javascript
const IPipeOperation = require('../src/interfaces/pipe-operation');

class TrimOperation extends IPipeOperation {
  getName() {
    return 'trim';
  }
  
  execute(value, args, context) {
    return String(value).trim();
  }
  
  validateArgs(args) {
    return args.length === 0; // Trim accepts no arguments
  }
  
  getMetadata() {
    return {
      name: this.getName(),
      description: 'Remove whitespace from both ends of a string',
      examples: [
        '{{ "  hello  " | trim }}',
        '{{ fieldName | trim }}'
      ],
      args: []
    };
  }
}

module.exports = TrimOperation;
```

## Creating an Advanced Operation

Operations can accept arguments and use context:

```javascript
const IPipeOperation = require('../src/interfaces/pipe-operation');

class PrefixOperation extends IPipeOperation {
  getName() {
    return 'prefix';
  }
  
  execute(value, args, context) {
    if (!this.validateArgs(args)) {
      throw new Error('prefix requires one argument');
    }
    
    const prefix = args[0];
    const str = String(value);
    
    // Use context for conditional behavior
    if (context && context.skipPrefix) {
      return str;
    }
    
    return `${prefix} ${str}`;
  }
  
  validateArgs(args) {
    return args.length === 1;
  }
  
  getMetadata() {
    return {
      name: 'prefix',
      description: 'Add a prefix to a string',
      examples: [
        '{{ "World" | prefix "Hello:" }}  → "Hello: World"',
        '{{ fileName | prefix "File:" }}'
      ],
      args: [
        {
          name: 'prefix',
          type: 'string',
          required: true,
          description: 'The prefix to add'
        }
      ]
    };
  }
}

module.exports = PrefixOperation;
```

## Registering Custom Operations

### Method 1: Traditional Function Export (Current)

The current pipe system expects functions. Wrap your operation class:

```javascript
// ~/.geese/pipes/my-operations.js
const TrimOperation = require('./trim-operation');

const trimOp = new TrimOperation();

module.exports = {
  [trimOp.getName()]: (value, args, context) => {
    return trimOp.execute(value, args, context);
  }
};
```

### Method 2: Class-Based Registry (Future)

Future versions may support registering operation instances directly:

```javascript
const PipeRegistry = require('../src/pipe-operations/pipe-registry');
const TrimOperation = require('./trim-operation');

const registry = new PipeRegistry();
const trimOp = new TrimOperation();

registry.registerOperation(trimOp); // Registers using getName()
```

## Best Practices

### 1. Single Responsibility

Each operation should do one thing well:

```javascript
// Good: Single purpose
class TrimOperation extends IPipeOperation {
  execute(value) { return String(value).trim(); }
}

// Avoid: Multiple purposes
class StringUtilsOperation extends IPipeOperation {
  execute(value, args) {
    // Doing trim, uppercase, lowercase based on args - too much!
  }
}
```

### 2. Validate Arguments

Always validate arguments to provide clear error messages:

```javascript
validateArgs(args) {
  if (args.length !== 2) {
    console.warn('substring requires start and end arguments');
    return false;
  }
  
  if (isNaN(parseInt(args[0])) || isNaN(parseInt(args[1]))) {
    console.warn('substring arguments must be numbers');
    return false;
  }
  
  return true;
}
```

### 3. Handle Edge Cases

Consider null, undefined, and unexpected inputs:

```javascript
execute(value, args, context) {
  if (value === null || value === undefined) {
    return ''; // or throw error, depending on requirements
  }
  
  return String(value).trim();
}
```

### 4. Use Context Wisely

Context provides access to other template variables:

```javascript
execute(value, args, context) {
  const separator = context.separator || ',';
  return value.split(separator);
}
```

### 5. Document Thoroughly

Good metadata helps users understand your operation:

```javascript
getMetadata() {
  return {
    name: 'split',
    description: 'Split a string into an array using a separator',
    examples: [
      '{{ "a,b,c" | split "," }}  → ["a", "b", "c"]',
      '{{ tags | split ";" | join ", " }}'
    ],
    args: [
      {
        name: 'separator',
        type: 'string',
        required: true,
        description: 'Character(s) to split on. Use context.separator as fallback.'
      }
    ],
    notes: [
      'If no separator is provided, checks context.separator',
      'Returns array that can be piped to other operations'
    ]
  };
}
```

## Testing Custom Operations

Operations are easy to unit test:

```javascript
const TrimOperation = require('./trim-operation');

// Test basic functionality
const trimOp = new TrimOperation();
console.assert(
  trimOp.execute('  hello  ') === 'hello',
  'Should trim whitespace'
);

// Test validation
console.assert(
  trimOp.validateArgs([]) === true,
  'Should accept no arguments'
);

console.assert(
  trimOp.validateArgs(['invalid']) === false,
  'Should reject arguments'
);

// Test metadata
const metadata = trimOp.getMetadata();
console.assert(
  metadata.name === 'trim',
  'Should have correct name in metadata'
);

console.log('All tests passed!');
```

### Integration Testing

Test in a real pipe chain:

```javascript
const PipeOperations = require('../src/pipe-operations');
const TrimOperation = require('./trim-operation');

const pipeOps = new PipeOperations();
const trimOp = new TrimOperation();

// Register operation
pipeOps.register(
  trimOp.getName(),
  (value, args, context) => trimOp.execute(value, args, context)
);

// Test in chain
const result = pipeOps.executePipeChain('  hello  | trim | toUpperCase', {});
console.assert(result === 'HELLO', 'Should work in pipe chain');
```

## Examples

See the following files for complete examples:

- [`examples/custom-pipes/example-trim-operation.js`](./examples/custom-pipes/example-trim-operation.js) - Simple operation
- [`examples/custom-pipes/example-advanced-operation.js`](./examples/custom-pipes/example-advanced-operation.js) - Advanced with args and context

## Migrating Existing Operations

If you have existing function-based operations, wrap them:

```javascript
// Old style
function customTrim(value) {
  return String(value).trim();
}

// Wrap in IPipeOperation for benefits
class CustomTrimOperation extends IPipeOperation {
  getName() { return 'customTrim'; }
  execute(value) { return customTrim(value); }
}
```

## Summary

Using `IPipeOperation` provides:

✅ **Type safety** - Required methods enforced  
✅ **Self-documenting** - Built-in metadata  
✅ **Testable** - Easy to unit test  
✅ **Reusable** - Share across projects  
✅ **Maintainable** - Clear structure and contracts  

Start with simple operations and gradually add validation, metadata, and context awareness as needed.
