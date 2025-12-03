const ObjectPathHelper = require('./utils/object-path-helper');

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
      ObjectPathHelper.setNestedValue(config, key, this.parseValue(value));
    }
    
    return config;
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
