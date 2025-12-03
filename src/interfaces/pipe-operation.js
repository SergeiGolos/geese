/**
 * Interface for pipe operations
 * Implementations must provide these methods to execute transformations
 * 
 * @interface IPipeOperation
 */
class IPipeOperation {
  /**
   * Execute the pipe operation
   * @param {*} value - Input value to transform
   * @param {string[]} args - Operation arguments
   * @param {Object} context - Execution context with additional data
   * @returns {*} Transformed value
   * @throws {Error} If not implemented by subclass
   * 
   * @example
   * class TrimOperation extends IPipeOperation {
   *   execute(value, args, context) {
   *     return String(value).trim();
   *   }
   * }
   */
  execute(value, args, context) {
    throw new Error('execute(value, args, context) must be implemented by subclass');
  }
  
  /**
   * Get the name of the operation
   * @returns {string} Operation name
   * @throws {Error} If not implemented by subclass
   * 
   * @example
   * getName() {
   *   return 'trim';
   * }
   */
  getName() {
    throw new Error('getName() must be implemented by subclass');
  }
  
  /**
   * Validate operation arguments (optional - default implementation accepts any args)
   * @param {string[]} args - Arguments to validate
   * @returns {boolean} True if arguments are valid
   * 
   * @example
   * validateArgs(args) {
   *   return args.length === 0; // This operation accepts no arguments
   * }
   */
  validateArgs(args) {
    return true; // Default: accept any arguments
  }
  
  /**
   * Get operation metadata (optional - for documentation and help)
   * @returns {Object} Metadata object with description, examples, etc.
   * 
   * @example
   * getMetadata() {
   *   return {
   *     description: 'Remove whitespace from both ends of a string',
   *     examples: ['{{ value | trim }}'],
   *     args: []
   *   };
   * }
   */
  getMetadata() {
    try {
      return {
        name: this.getName(),
        description: 'No description available',
        examples: [],
        args: []
      };
    } catch (error) {
      // If getName() is not implemented, return minimal metadata
      return {
        name: 'unknown',
        description: 'No description available',
        examples: [],
        args: []
      };
    }
  }
}

module.exports = IPipeOperation;
