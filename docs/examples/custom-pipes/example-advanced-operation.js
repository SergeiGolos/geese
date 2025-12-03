/**
 * Example: Advanced custom pipe operation with arguments and context
 * 
 * This example demonstrates a more complex pipe operation that:
 * - Accepts arguments
 * - Uses execution context
 * - Implements validation
 * - Provides detailed metadata
 */

const IPipeOperation = require('../../../src/interfaces/pipe-operation');

/**
 * PrefixOperation - Add a prefix to a string
 * 
 * Usage: {{ value | prefix "Hello:" }}
 * Result: "Hello: value"
 */
class PrefixOperation extends IPipeOperation {
  getName() {
    return 'prefix';
  }
  
  /**
   * Execute the prefix operation
   * @param {*} value - Input value
   * @param {string[]} args - [prefix] - The prefix to add
   * @param {Object} context - Execution context (can access other variables)
   * @returns {string} Prefixed string
   */
  execute(value, args, context) {
    if (!this.validateArgs(args)) {
      throw new Error('prefix operation requires exactly one argument');
    }
    
    const prefix = args[0];
    const str = String(value);
    
    // You can use context to make operations context-aware
    // For example, conditionally apply prefix based on context
    if (context && context.skipPrefix) {
      return str;
    }
    
    return `${prefix} ${str}`;
  }
  
  validateArgs(args) {
    if (args.length !== 1) {
      console.warn('prefix operation requires exactly one argument: the prefix string');
      return false;
    }
    return true;
  }
  
  getMetadata() {
    return {
      name: this.getName(),
      description: 'Add a prefix to a string',
      examples: [
        '{{ "World" | prefix "Hello:" }}  → "Hello: World"',
        '{{ fileName | prefix "File:" }}',
        '{{ title | prefix "Task:" | toUpperCase }}'
      ],
      args: [
        {
          name: 'prefix',
          type: 'string',
          required: true,
          description: 'The prefix to add before the value'
        }
      ]
    };
  }
}

/**
 * ConditionalOperation - Apply transformation conditionally
 * 
 * Usage: {{ value | conditional "key" "transform" }}
 * Only applies if context[key] is truthy
 */
class ConditionalOperation extends IPipeOperation {
  getName() {
    return 'conditional';
  }
  
  execute(value, args, context) {
    if (!this.validateArgs(args)) {
      return value;
    }
    
    const [conditionKey, transform] = args;
    
    // Check condition in context
    if (!context || !context[conditionKey]) {
      return value; // Condition not met, return unchanged
    }
    
    // Apply simple transformations
    const str = String(value);
    switch (transform) {
      case 'uppercase':
        return str.toUpperCase();
      case 'lowercase':
        return str.toLowerCase();
      case 'capitalize':
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      default:
        return str;
    }
  }
  
  validateArgs(args) {
    if (args.length !== 2) {
      console.warn('conditional operation requires two arguments: condition key and transform');
      return false;
    }
    
    const validTransforms = ['uppercase', 'lowercase', 'capitalize'];
    if (!validTransforms.includes(args[1])) {
      console.warn(`Invalid transform: ${args[1]}. Valid options: ${validTransforms.join(', ')}`);
      return false;
    }
    
    return true;
  }
  
  getMetadata() {
    return {
      name: this.getName(),
      description: 'Apply a transformation only if a context condition is met',
      examples: [
        '{{ title | conditional "isImportant" "uppercase" }}',
        '{{ fileName | conditional "shouldCapitalize" "capitalize" }}'
      ],
      args: [
        {
          name: 'condition',
          type: 'string',
          required: true,
          description: 'Key in context to check (must be truthy)'
        },
        {
          name: 'transform',
          type: 'string',
          required: true,
          description: 'Transformation to apply: uppercase, lowercase, or capitalize'
        }
      ]
    };
  }
}

module.exports = {
  PrefixOperation,
  ConditionalOperation
};

// Usage example:
/*
// In your custom pipe file (e.g., ~/.geese/pipes/custom-operations.js):

const { PrefixOperation, ConditionalOperation } = require('./example-advanced-operation');

// Create instances
const prefixOp = new PrefixOperation();
const conditionalOp = new ConditionalOperation();

// Export as standard pipe functions
module.exports = {
  [prefixOp.getName()]: (value, args, context) => prefixOp.execute(value, args, context),
  [conditionalOp.getName()]: (value, args, context) => conditionalOp.execute(value, args, context)
};

// Now use in .geese files:
// ---
// $recipe: goose
// $title: |
//   {{ fileName | prefix "Review:" | conditional "isUrgent" "uppercase" }}
// ---
*/
