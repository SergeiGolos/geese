/**
 * Type Operations
 * Built-in type conversion and parsing operations
 */

class TypeOperations {
  /**
   * Register all type operations
   * @param {Object} registry - Pipe registry to register operations with
   */
  static register(registry) {
    registry.register('parseJson', (value) => {
      const str = String(value);
      try {
        return JSON.parse(str);
      } catch (err) {
        throw new Error(`parseJson operation: Malformed JSON input. ${err.message}`);
      }
    }, true);

    registry.register('stringify', (value, args) => {
      let indent = 2;
      if (args[0]) {
        const parsed = parseInt(args[0], 10);
        indent = isNaN(parsed) ? 2 : parsed;
      }
      return JSON.stringify(value, null, indent);
    }, true);

    registry.register('parseYaml', (value) => {
      // Simple YAML parsing for basic cases
      // For complex YAML, users should use a proper parser
      const str = String(value);
      const lines = str.split('\n');
      const result = {};
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex !== -1) {
          const key = trimmed.substring(0, colonIndex).trim();
          let val = trimmed.substring(colonIndex + 1).trim();
          
          // Remove quotes if present
          if ((val.startsWith('"') && val.endsWith('"')) || 
              (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          
          result[key] = val;
        }
      }
      
      return result;
    }, true);

    registry.register('parseInt', (value, args) => {
      const radix = args[0] ? parseInt(args[0], 10) : 10;
      return parseInt(String(value), radix);
    }, true);

    registry.register('parseFloat', (value) => {
      return parseFloat(String(value));
    }, true);
  }
}

module.exports = TypeOperations;
