/**
 * Glob Operations
 * Built-in file pattern matching operations (like include/exclude)
 */

const { minimatch } = require('minimatch');

class GlobOperations {
  /**
   * Register all glob operations
   * @param {Object} registry - Pipe registry to register operations with
   */
  static register(registry) {
    /**
     * globMatch - Test if a string matches a glob pattern
     * @param {string} value - String to test
     * @param {array} args - [pattern, options (optional)]
     *   pattern: Glob pattern (e.g., "*.js", "src/**\/*.ts")
     *   options: Optional flags like 'i' for case-insensitive
     * @returns {boolean} True if matches
     * 
     * Examples:
     *   "test.js" ~> globMatch "*.js"  // true
     *   "src/app.ts" ~> globMatch "**\/*.ts"  // true
     *   "TEST.JS" ~> globMatch "*.js" i  // true (case-insensitive)
     */
    registry.register('globMatch', (value, args) => {
      if (args.length === 0) {
        throw new Error('globMatch operation requires a pattern argument');
      }
      
      const pattern = args[0];
      const options = args[1] || '';
      const str = String(value);
      
      const matchOptions = {
        nocase: options.includes('i'),
        dot: true  // Match dotfiles by default
      };
      
      try {
        return minimatch(str, pattern, matchOptions);
      } catch (err) {
        throw new Error(`globMatch operation: Invalid pattern '${pattern}'. ${err.message}`);
      }
    }, true);

    /**
     * globFilter - Filter array of strings by glob pattern (like include/exclude)
     * @param {array} value - Array of strings to filter
     * @param {array} args - [pattern, mode (optional)]
     *   pattern: Glob pattern
     *   mode: 'include' (default) or 'exclude'
     * @returns {array} Filtered array
     * 
     * Examples:
     *   ["test.js", "app.ts", "test.ts"] ~> globFilter "*.js"  // ["test.js"]
     *   ["a.js", "b.js", "c.txt"] ~> globFilter "*.js" exclude  // ["c.txt"]
     *   files ~> globFilter "src/**\/*.js"  // all .js files in src
     */
    registry.register('globFilter', (value, args) => {
      if (!Array.isArray(value)) {
        throw new Error('globFilter operation requires an array');
      }
      
      if (args.length === 0) {
        throw new Error('globFilter operation requires a pattern argument');
      }
      
      const pattern = args[0];
      const mode = args[1] || 'include';
      const isExclude = mode === 'exclude';
      
      try {
        return value.filter(item => {
          const str = String(item);
          const matches = minimatch(str, pattern, { dot: true });
          return isExclude ? !matches : matches;
        });
      } catch (err) {
        throw new Error(`globFilter operation: Invalid pattern '${pattern}'. ${err.message}`);
      }
    }, true);

    /**
     * globFilterMulti - Filter array by multiple patterns (like $include/$exclude)
     * @param {array} value - Array of strings to filter
     * @param {array} args - [includePatterns, excludePatterns]
     *   includePatterns: Comma-separated include patterns or JSON array string
     *   excludePatterns: Optional comma-separated exclude patterns or JSON array string
     * @returns {array} Filtered array
     * 
     * Examples:
     *   files ~> globFilterMulti "*.js,*.ts"  // includes .js and .ts files
     *   files ~> globFilterMulti "**\/*.js" "**\/*.test.js"  // .js but not .test.js
     *   files ~> globFilterMulti '["*.js","*.ts"]' '["*.test.*"]'
     */
    registry.register('globFilterMulti', (value, args) => {
      if (!Array.isArray(value)) {
        throw new Error('globFilterMulti operation requires an array');
      }
      
      if (args.length === 0) {
        throw new Error('globFilterMulti operation requires at least one pattern argument');
      }
      
      // Parse include patterns
      let includePatterns = [];
      if (args[0]) {
        try {
          // Try parsing as JSON array first
          includePatterns = JSON.parse(args[0]);
        } catch {
          // Otherwise split by comma
          includePatterns = args[0].split(',').map(p => p.trim());
        }
      }
      
      // Parse exclude patterns
      let excludePatterns = [];
      if (args[1]) {
        try {
          // Try parsing as JSON array first
          excludePatterns = JSON.parse(args[1]);
        } catch {
          // Otherwise split by comma
          excludePatterns = args[1].split(',').map(p => p.trim());
        }
      }
      
      return value.filter(item => {
        const str = String(item);
        
        // Check include patterns
        let included = includePatterns.length === 0;
        for (const pattern of includePatterns) {
          if (minimatch(str, pattern, { dot: true })) {
            included = true;
            break;
          }
        }
        
        if (!included) return false;
        
        // Check exclude patterns
        for (const pattern of excludePatterns) {
          if (minimatch(str, pattern, { dot: true })) {
            return false;
          }
        }
        
        return true;
      });
    }, true);

    /**
     * globExtract - Extract parts of string matching glob pattern
     * @param {string} value - String to extract from
     * @param {array} args - [pattern] - Glob pattern with capture groups
     * @returns {string|null} Extracted portion or null
     * 
     * Example:
     *   "src/app/component.js" ~> globExtract "src/*\/*.js"  // matches the pattern
     */
    registry.register('globExtract', (value, args) => {
      if (args.length === 0) {
        throw new Error('globExtract operation requires a pattern argument');
      }
      
      const pattern = args[0];
      const str = String(value);
      
      try {
        if (minimatch(str, pattern, { dot: true })) {
          return str;
        }
        return null;
      } catch (err) {
        throw new Error(`globExtract operation: Invalid pattern '${pattern}'. ${err.message}`);
      }
    }, true);
  }
}

module.exports = GlobOperations;
