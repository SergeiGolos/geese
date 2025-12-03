/**
 * Regex Operations
 * Built-in regular expression operations
 */

class RegexOperations {
  /**
   * Register all regex operations
   * @param {Object} registry - Pipe registry to register operations with
   */
  static register(registry) {
    registry.register('match', (value, args) => {
      const str = String(value);
      if (args.length === 0) {
        throw new Error('match operation requires a pattern argument');
      }
      const pattern = new RegExp(args[0], args[1] || '');
      const matches = str.match(pattern);
      return matches || [];
    }, true);

    registry.register('test', (value, args) => {
      const str = String(value);
      if (args.length === 0) {
        throw new Error('test operation requires a pattern argument');
      }
      const pattern = new RegExp(args[0], args[1] || '');
      return pattern.test(str);
    }, true);
  }
}

module.exports = RegexOperations;
