/**
 * Built-in Operations
 * Registers all built-in pipe operations
 */

const StringOperations = require('./operations/string-operations');
const ListOperations = require('./operations/list-operations');
const TypeOperations = require('./operations/type-operations');
const RegexOperations = require('./operations/regex-operations');
const UtilityOperations = require('./operations/utility-operations');
const TextOperations = require('./operations/text-operations');
const JsonQueryOperations = require('./operations/json-query-operations');
const GlobOperations = require('./operations/glob-operations');

class BuiltInOperations {
  /**
   * Register all built-in operations
   * @param {Object} registry - Pipe registry to register operations with
   * @param {Object} fileOperations - File operations instance with rate limiter
   */
  static registerAll(registry, fileOperations) {
    StringOperations.register(registry);
    fileOperations.register(registry);
    ListOperations.register(registry);
    TypeOperations.register(registry);
    RegexOperations.register(registry);
    UtilityOperations.register(registry);
    TextOperations.register(registry);
    JsonQueryOperations.register(registry);
    GlobOperations.register(registry);
  }
}

module.exports = BuiltInOperations;
