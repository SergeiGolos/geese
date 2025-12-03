/**
 * Example: Creating a custom pipe operation using the IPipeOperation interface
 * 
 * This example demonstrates the Strategy Pattern for pipe operations.
 * By extending IPipeOperation, you create a self-contained operation
 * that can be registered and used in pipe chains.
 */

const IPipeOperation = require('../../../src/interfaces/pipe-operation');

/**
 * TrimOperation - Removes whitespace from both ends of a string
 * 
 * This is a simple example that demonstrates the basic structure
 * of a pipe operation class.
 */
class TrimOperation extends IPipeOperation {
  /**
   * Get the name of this operation
   * This name will be used in pipe chains: {{ value | trim }}
   * @returns {string} Operation name
   */
  getName() {
    return 'trim';
  }
  
  /**
   * Execute the trim operation
   * @param {*} value - Input value to transform
   * @param {string[]} args - Operation arguments (unused for trim)
   * @param {Object} context - Execution context (unused for trim)
   * @returns {string} Trimmed string
   */
  execute(value, args, context) {
    return String(value).trim();
  }
  
  /**
   * Validate arguments (optional)
   * Trim accepts no arguments
   * @param {string[]} args - Arguments to validate
   * @returns {boolean} True if arguments are valid
   */
  validateArgs(args) {
    if (args.length > 0) {
      console.warn('trim operation does not accept arguments');
      return false;
    }
    return true;
  }
  
  /**
   * Get operation metadata (optional but recommended)
   * Used for documentation and help text
   * @returns {Object} Metadata object
   */
  getMetadata() {
    return {
      name: this.getName(),
      description: 'Remove whitespace from both ends of a string',
      examples: [
        '{{ "  hello  " | trim }}  → "hello"',
        '{{ fieldName | trim }}'
      ],
      args: []
    };
  }
}

module.exports = TrimOperation;

// Usage example (not executed, just for reference):
/*
const PipeOperations = require('../../../src/pipe-operations');
const TrimOperation = require('./example-trim-operation');

// Create an instance of the operation
const trimOp = new TrimOperation();

// Register it with the pipe operations registry
const pipeOps = new PipeOperations();
pipeOps.register(trimOp.getName(), (value, args, context) => {
  return trimOp.execute(value, args, context);
});

// Now it can be used in .geese files:
// ---
// $recipe: goose
// $title: |
//   {{ fileName | trim }}
// ---
*/
