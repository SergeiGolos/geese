/**
 * List Operations
 * Built-in array/list manipulation operations
 */

class ListOperations {
  /**
   * Register all list operations
   * @param {Object} registry - Pipe registry to register operations with
   */
  static register(registry) {
    registry.register('filter', (value, args) => {
      if (!Array.isArray(value)) {
        throw new Error('filter operation requires an array');
      }
      if (args.length === 0) {
        throw new Error('filter operation requires a pattern argument');
      }
      const pattern = new RegExp(args[0]);
      return value.filter(item => pattern.test(String(item)));
    }, true);

    registry.register('map', (value, args) => {
      if (!Array.isArray(value)) {
        throw new Error('map operation requires an array');
      }
      if (args.length === 0) {
        throw new Error('map operation requires a property name');
      }
      const propName = args[0];
      return value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return item[propName];
        }
        return item;
      });
    }, true);

    registry.register('select', (value, args) => {
      if (!Array.isArray(value)) {
        throw new Error('select operation requires an array');
      }
      if (args.length === 0) {
        throw new Error('select operation requires an index');
      }
      const index = parseInt(args[0], 10);
      return value[index];
    }, true);

    registry.register('first', (value) => {
      if (!Array.isArray(value)) {
        throw new Error('first operation requires an array');
      }
      return value[0];
    }, true);

    registry.register('last', (value) => {
      if (!Array.isArray(value)) {
        throw new Error('last operation requires an array');
      }
      return value[value.length - 1];
    }, true);

    registry.register('length', (value) => {
      if (Array.isArray(value) || typeof value === 'string') {
        return value.length;
      }
      return 0;
    }, true);
  }
}

module.exports = ListOperations;
