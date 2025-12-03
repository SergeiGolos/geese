/**
 * String Operations
 * Built-in string manipulation operations
 */

class StringOperations {
  /**
   * Register all string operations
   * @param {Object} registry - Pipe registry to register operations with
   */
  static register(registry) {
    registry.register('trim', (value) => {
      return String(value).trim();
    }, true);

    registry.register('substring', (value, args) => {
      const str = String(value);
      const start = parseInt(args[0], 10) || 0;
      const end = args[1] !== undefined ? parseInt(args[1], 10) : undefined;
      return str.substring(start, end);
    }, true);

    registry.register('toUpperCase', (value) => {
      return String(value).toUpperCase();
    }, true);

    registry.register('toLowerCase', (value) => {
      return String(value).toLowerCase();
    }, true);

    registry.register('replace', (value, args) => {
      const str = String(value);
      if (args.length < 2) {
        throw new Error('replace operation requires 2 arguments: pattern and replacement');
      }
      const pattern = args[0];
      const replacement = args[1];
      // Use replaceAll for global replacement
      return str.split(pattern).join(replacement);
    }, true);

    registry.register('split', (value, args) => {
      const str = String(value);
      const separator = args[0] || ',';
      return str.split(separator);
    }, true);

    registry.register('join', (value, args) => {
      if (!Array.isArray(value)) {
        throw new Error('join operation requires an array');
      }
      const separator = args[0] || ',';
      return value.join(separator);
    }, true);
  }
}

module.exports = StringOperations;
