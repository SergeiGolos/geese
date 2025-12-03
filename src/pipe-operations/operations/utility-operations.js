/**
 * Utility Operations
 * Built-in utility and helper operations
 */

class UtilityOperations {
  /**
   * Register all utility operations
   * @param {Object} registry - Pipe registry to register operations with
   */
  static register(registry) {
    registry.register('default', (value, args) => {
      if (value === null || value === undefined || value === '') {
        return args[0] || '';
      }
      return value;
    }, true);

    registry.register('echo', (value) => {
      // Useful for debugging
      console.log('[PIPE DEBUG]', value);
      return value;
    }, true);
  }
}

module.exports = UtilityOperations;
