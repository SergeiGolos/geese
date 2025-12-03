/**
 * JSON Query Operations
 * Built-in JSON querying operations (jq-like functionality)
 */

class JsonQueryOperations {
  /**
   * Register all JSON query operations
   * @param {Object} registry - Pipe registry to register operations with
   */
  static register(registry) {
    /**
     * jqSelect - Select a value from JSON using a path (like jq)
     * @param {object|string} value - JSON object or JSON string
     * @param {array} args - Path segments to the desired value
     * @returns {*} Selected value
     * 
     * Examples:
     *   {"user": {"name": "John"}} ~> jqSelect user name  // "John"
     *   {"items": [1, 2, 3]} ~> jqSelect items 0  // 1
     *   jsonString ~> parseJson ~> jqSelect data result
     */
    registry.register('jqSelect', (value, args) => {
      if (args.length === 0) {
        throw new Error('jqSelect operation requires at least one path argument');
      }
      
      // Parse JSON string if needed
      let obj = value;
      if (typeof value === 'string') {
        try {
          obj = JSON.parse(value);
        } catch (err) {
          throw new Error(`jqSelect operation: Invalid JSON input. ${err.message}`);
        }
      }
      
      // Navigate through the path
      let current = obj;
      for (const key of args) {
        if (current === null || current === undefined) {
          return null;
        }
        
        // Handle array indices
        if (Array.isArray(current)) {
          const index = parseInt(key, 10);
          if (isNaN(index)) {
            throw new Error(`jqSelect operation: Invalid array index '${key}'`);
          }
          current = current[index];
        } else if (typeof current === 'object') {
          current = current[key];
        } else {
          throw new Error(`jqSelect operation: Cannot access property '${key}' on non-object`);
        }
      }
      
      return current;
    }, true);

    /**
     * jqKeys - Get all keys from a JSON object (like jq 'keys')
     * @param {object|string} value - JSON object or JSON string
     * @returns {array} Array of keys
     * 
     * Example:
     *   {"a": 1, "b": 2} ~> jqKeys  // ["a", "b"]
     */
    registry.register('jqKeys', (value) => {
      let obj = value;
      if (typeof value === 'string') {
        try {
          obj = JSON.parse(value);
        } catch (err) {
          throw new Error(`jqKeys operation: Invalid JSON input. ${err.message}`);
        }
      }
      
      if (typeof obj !== 'object' || obj === null) {
        throw new Error('jqKeys operation requires an object');
      }
      
      if (Array.isArray(obj)) {
        // For arrays, return indices as strings
        return obj.map((_, i) => String(i));
      }
      
      return Object.keys(obj);
    }, true);

    /**
     * jqValues - Get all values from a JSON object/array (like jq '.[]')
     * @param {object|array|string} value - JSON object/array or JSON string
     * @returns {array} Array of values
     * 
     * Examples:
     *   {"a": 1, "b": 2} ~> jqValues  // [1, 2]
     *   [1, 2, 3] ~> jqValues  // [1, 2, 3]
     */
    registry.register('jqValues', (value) => {
      let obj = value;
      if (typeof value === 'string') {
        try {
          obj = JSON.parse(value);
        } catch (err) {
          throw new Error(`jqValues operation: Invalid JSON input. ${err.message}`);
        }
      }
      
      if (Array.isArray(obj)) {
        return obj;
      }
      
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj);
      }
      
      throw new Error('jqValues operation requires an object or array');
    }, true);

    /**
     * jqFilter - Filter array elements based on a property condition
     * @param {array|string} value - JSON array or JSON string
     * @param {array} args - [property, operator, compareValue]
     *   property: Property name to check (or empty for direct value)
     *   operator: Comparison operator (==, !=, >, <, >=, <=, contains)
     *   compareValue: Value to compare against
     * @returns {array} Filtered array
     * 
     * Examples:
     *   [{"age": 25}, {"age": 30}] ~> jqFilter age > 26  // [{"age": 30}]
     *   ["apple", "banana"] ~> jqFilter "" contains a  // ["apple", "banana"]
     *   data ~> jqFilter status == active
     */
    registry.register('jqFilter', (value, args) => {
      if (args.length < 3) {
        throw new Error('jqFilter operation requires 3 arguments: property, operator, compareValue');
      }
      
      let arr = value;
      if (typeof value === 'string') {
        try {
          arr = JSON.parse(value);
        } catch (err) {
          throw new Error(`jqFilter operation: Invalid JSON input. ${err.message}`);
        }
      }
      
      if (!Array.isArray(arr)) {
        throw new Error('jqFilter operation requires an array');
      }
      
      const property = args[0];
      const operator = args[1];
      const compareValue = args[2];
      
      return arr.filter(item => {
        // Get the value to compare
        let itemValue = item;
        if (property && property !== '') {
          itemValue = typeof item === 'object' && item !== null ? item[property] : undefined;
        }
        
        // Perform comparison based on operator
        switch (operator) {
          case '==':
            // Loose equality comparison
            return itemValue == compareValue;
          case '===':
            // Strict equality with string conversion for consistency
            return String(itemValue) === String(compareValue);
          case '!=':
            // Loose inequality comparison
            return itemValue != compareValue;
          case '!==':
            // Strict inequality with string conversion for consistency
            return String(itemValue) !== String(compareValue);
          case '>':
            return Number(itemValue) > Number(compareValue);
          case '<':
            return Number(itemValue) < Number(compareValue);
          case '>=':
            return Number(itemValue) >= Number(compareValue);
          case '<=':
            return Number(itemValue) <= Number(compareValue);
          case 'contains':
            return String(itemValue).includes(String(compareValue));
          default:
            throw new Error(`jqFilter operation: Unknown operator '${operator}'`);
        }
      });
    }, true);

    /**
     * jqMap - Map array elements to extract a property (like jq 'map(.property)')
     * @param {array|string} value - JSON array or JSON string
     * @param {array} args - [property] - Property to extract
     * @returns {array} Array of extracted values (undefined for items without the property)
     * 
     * Example:
     *   [{"name": "A"}, {"name": "B"}] ~> jqMap name  // ["A", "B"]
     * 
     * Note: Returns undefined for non-object items or items missing the property.
     * This behavior matches jq's map operation.
     */
    registry.register('jqMap', (value, args) => {
      if (args.length === 0) {
        throw new Error('jqMap operation requires a property argument');
      }
      
      let arr = value;
      if (typeof value === 'string') {
        try {
          arr = JSON.parse(value);
        } catch (err) {
          throw new Error(`jqMap operation: Invalid JSON input. ${err.message}`);
        }
      }
      
      if (!Array.isArray(arr)) {
        throw new Error('jqMap operation requires an array');
      }
      
      const property = args[0];
      return arr.map(item => {
        if (typeof item === 'object' && item !== null) {
          return item[property];
        }
        // Return undefined for non-objects, consistent with jq behavior
        return undefined;
      });
    }, true);

    /**
     * jqLength - Get length of array or object (like jq 'length')
     * @param {object|array|string} value - JSON object/array or JSON string
     * @returns {number} Length
     * 
     * Examples:
     *   [1, 2, 3] ~> jqLength  // 3
     *   {"a": 1, "b": 2} ~> jqLength  // 2
     */
    registry.register('jqLength', (value) => {
      let obj = value;
      if (typeof value === 'string') {
        try {
          obj = JSON.parse(value);
        } catch (err) {
          throw new Error(`jqLength operation: Invalid JSON input. ${err.message}`);
        }
      }
      
      if (Array.isArray(obj)) {
        return obj.length;
      }
      
      if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj).length;
      }
      
      throw new Error('jqLength operation requires an object or array');
    }, true);

    /**
     * jqHas - Check if object has a key (like jq 'has("key")')
     * @param {object|string} value - JSON object or JSON string
     * @param {array} args - [key] - Key to check
     * @returns {boolean} True if key exists
     * 
     * Example:
     *   {"a": 1} ~> jqHas a  // true
     */
    registry.register('jqHas', (value, args) => {
      if (args.length === 0) {
        throw new Error('jqHas operation requires a key argument');
      }
      
      let obj = value;
      if (typeof value === 'string') {
        try {
          obj = JSON.parse(value);
        } catch (err) {
          throw new Error(`jqHas operation: Invalid JSON input. ${err.message}`);
        }
      }
      
      if (typeof obj !== 'object' || obj === null) {
        return false;
      }
      
      const key = args[0];
      return key in obj;
    }, true);
  }
}

module.exports = JsonQueryOperations;
