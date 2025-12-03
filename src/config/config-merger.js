/**
 * Config Merger
 * Handles deep merging of configuration objects with prototype pollution guards
 */

class ConfigMerger {
  /**
   * Deep merge multiple configuration objects
   * Later objects override earlier ones
   * @param {...Object} configs - Configuration objects to merge
   * @returns {Object} Merged configuration
   */
  static deepMerge(...configs) {
    const result = {};
    
    for (const config of configs) {
      // Skip null, undefined, or non-objects
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        continue;
      }
      
      for (const key in config) {
        if (Object.prototype.hasOwnProperty.call(config, key)) {
          // Guard against prototype pollution in configuration files
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            console.warn(`Warning: Ignoring dangerous key "${key}" in configuration`);
            continue;
          }
          
          const value = config[key];
          
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Recursively merge objects
            result[key] = ConfigMerger.deepMerge(result[key] || {}, value);
          } else {
            // Override with new value (includes arrays)
            result[key] = value;
          }
        }
      }
    }
    
    return result;
  }
}

module.exports = ConfigMerger;
