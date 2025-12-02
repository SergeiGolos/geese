/**
 * Parse command-line arguments and convert them to configuration overrides
 * Supports both --key value and --key=value formats
 */
class CLIArgumentParser {
  /**
   * Parse CLI arguments into configuration object
   * @param {Array} args - Process arguments array
   * @returns {Object} Configuration object
   */
  static parseToConfig(args) {
    const config = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      // Skip if not an option
      if (!arg.startsWith('--')) {
        continue;
      }
      
      // Remove -- prefix
      let key = arg.substring(2);
      let value;
      
      // Check for --key=value format
      if (key.includes('=')) {
        const parts = key.split('=');
        key = parts[0];
        value = parts.slice(1).join('=');
      } else {
        // Check for --key value format
        if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          value = args[i + 1];
          i++; // Skip next argument
        } else {
          // Boolean flag
          value = true;
        }
      }
      
      // Convert key to nested object structure
      // e.g., 'goose.model' becomes { goose: { model: value } }
      this.setNestedValue(config, key, this.parseValue(value));
    }
    
    return config;
  }

  /**
   * Set nested value in object using dot notation
   * @param {Object} obj - Object to modify
   * @param {string} key - Key in dot notation
   * @param {*} value - Value to set
   */
  static setNestedValue(obj, key, value) {
    const keys = key.split('.');
    
    // Guard against prototype pollution
    for (const k of keys) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
        throw new Error(`Invalid configuration key: ${key}. Keys cannot contain '__proto__', 'constructor', or 'prototype'.`);
      }
    }
    
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      
      // Use Object.prototype.hasOwnProperty for safer checks
      if (!Object.prototype.hasOwnProperty.call(current, k)) {
        // Use Object.create(null) to create an object without prototype
        const newObj = Object.create(null);
        Object.defineProperty(current, k, {
          value: newObj,
          writable: true,
          enumerable: true,
          configurable: true
        });
      } else if (typeof current[k] !== 'object' || current[k] === null) {
        // If intermediate value is not an object, replace it with an object
        const newObj = Object.create(null);
        Object.defineProperty(current, k, {
          value: newObj,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
      // Safe to traverse because all keys have been validated above
      current = current[k];
    }
    
    // Set the final value using Object.defineProperty
    // Safe because all keys have been validated above (lines 64-68)
    const finalKey = keys[keys.length - 1];
    
    // Additional safety check (though redundant with validation above)
    if (finalKey !== '__proto__' && finalKey !== 'constructor' && finalKey !== 'prototype') {
      Object.defineProperty(current, finalKey, {
        value: value,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  }

  /**
   * Parse value to appropriate type
   * @param {string} value - String value
   * @returns {*} Parsed value
   */
  static parseValue(value) {
    // Handle non-string values
    if (typeof value !== 'string') {
      return value;
    }
    
    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Number
    if (/^-?\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^-?\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }
    
    // JSON array or object
    if (value.startsWith('[') || value.startsWith('{')) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // Not valid JSON, return as string
      }
    }
    
    // String
    return value;
  }

  /**
   * Generate help text for configuration options
   * @returns {string} Help text
   */
  static getConfigHelp() {
    return `
Configuration Options:
  --model <name>              AI model to use (e.g., gpt-4, claude-3)
  --temperature <number>      Temperature for AI responses (0.0-1.0)
  --max-tokens <number>       Maximum tokens in response
  --recipe <name>             Recipe name to use
  --goose.model <name>        Tool-specific model (nested config)
  
Examples:
  geese run --model gpt-4 --temperature 0.8
  geese run --goose.model claude-3 --goose.temperature 0.5
  geese run -f review.geese --model gpt-4
`;
  }
}

module.exports = CLIArgumentParser;
