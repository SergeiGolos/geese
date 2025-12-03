/**
 * ObjectPathHelper - Utility for safe nested object operations
 * 
 * Provides methods to safely get, set, and validate nested object paths
 * with built-in protection against prototype pollution attacks.
 */

class ObjectPathHelper {
  /**
   * List of dangerous keys that could lead to prototype pollution
   * @type {string[]}
   */
  static DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
  
  /**
   * Validate a path string and split it into keys
   * @param {string} path - Dot-notation path (e.g., 'goose.model')
   * @returns {string[]} Array of validated keys
   * @throws {Error} If path contains dangerous properties
   */
  static validatePath(path) {
    if (typeof path !== 'string' || path.length === 0) {
      throw new Error('Path must be a non-empty string');
    }
    
    const keys = path.split('.');
    
    for (const key of keys) {
      if (this.DANGEROUS_KEYS.includes(key)) {
        throw new Error(
          `Invalid configuration key: ${path}. Keys cannot contain '__proto__', 'constructor', or 'prototype'.`
        );
      }
    }
    
    return keys;
  }
  
  /**
   * Set a nested value in an object using dot notation
   * @param {Object} obj - Target object
   * @param {string} path - Dot-notation path (e.g., 'goose.model')
   * @param {*} value - Value to set
   * @returns {Object} The modified object
   */
  static setNestedValue(obj, path, value) {
    const keys = this.validatePath(path);
    let current = obj;
    
    // Navigate to the parent of the final key
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      
      // Check if property exists and is an object
      if (!Object.prototype.hasOwnProperty.call(current, key)) {
        current[key] = {};
      } else if (typeof current[key] !== 'object' || current[key] === null || Array.isArray(current[key])) {
        // If intermediate value is not a plain object, replace it
        current[key] = {};
      }
      
      current = current[key];
    }
    
    // Set the final value
    const finalKey = keys[keys.length - 1];
    current[finalKey] = value;
    
    return obj;
  }
  
  /**
   * Get a nested value from an object using dot notation
   * @param {Object} obj - Source object
   * @param {string} path - Dot-notation path (e.g., 'goose.model')
   * @returns {*} The value at the path, or undefined if not found
   */
  static getNestedValue(obj, path) {
    const keys = this.validatePath(path);
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  /**
   * Delete a nested value from an object using dot notation
   * @param {Object} obj - Target object
   * @param {string} path - Dot-notation path (e.g., 'goose.model')
   * @returns {boolean} True if the property was deleted, false otherwise
   */
  static deleteNestedValue(obj, path) {
    const keys = this.validatePath(path);
    
    if (keys.length === 0) {
      return false;
    }
    
    // Navigate to parent of final key
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current || typeof current !== 'object' || !(key in current)) {
        return false;
      }
      current = current[key];
    }
    
    // Delete the final key
    const finalKey = keys[keys.length - 1];
    if (current && typeof current === 'object' && finalKey in current) {
      delete current[finalKey];
      return true;
    }
    
    return false;
  }
}

module.exports = ObjectPathHelper;
