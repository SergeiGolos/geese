/**
 * Text Operations
 * Built-in text search and manipulation operations (grep-like functionality)
 */

class TextOperations {
  /**
   * Register all text operations
   * @param {Object} registry - Pipe registry to register operations with
   */
  static register(registry) {
    /**
     * grep - Search for lines matching a pattern (like grep command)
     * @param {string|array} value - Text to search (string or array of lines)
     * @param {array} args - [pattern, flags (optional), options (optional)]
     *   pattern: Regular expression pattern to search for
     *   flags: Optional regex flags (e.g., 'i' for case-insensitive)
     *   options: Optional 'v' to invert match (like grep -v)
     * @returns {array} Array of matching lines
     * 
     * Examples:
     *   "line1\nline2\nline3" ~> grep "line2"  // ["line2"]
     *   "Error: test\nInfo: test\nError: fail" ~> grep "^Error" // ["Error: test", "Error: fail"]
     *   text ~> grep "pattern" i  // case-insensitive search
     *   text ~> grep "pattern" "" v  // invert match (exclude lines with pattern)
     */
    registry.register('grep', (value, args) => {
      if (args.length === 0) {
        throw new Error('grep operation requires a pattern argument');
      }
      
      const pattern = args[0];
      const flags = args[1] || '';
      const options = args[2] || '';
      const invertMatch = options.includes('v');
      
      // Convert value to array of lines if it's a string
      const lines = Array.isArray(value) ? value : String(value).split('\n');
      
      try {
        const regex = new RegExp(pattern, flags);
        return lines.filter(line => {
          const matches = regex.test(String(line));
          return invertMatch ? !matches : matches;
        });
      } catch (err) {
        throw new Error(`grep operation: Invalid regex pattern '${pattern}'. ${err.message}`);
      }
    }, true);

    /**
     * grepCount - Count lines matching a pattern
     * @param {string|array} value - Text to search
     * @param {array} args - [pattern, flags (optional)]
     * @returns {number} Number of matching lines
     * 
     * Example:
     *   "line1\nline2\nline3" ~> grepCount "line"  // 3
     */
    registry.register('grepCount', (value, args) => {
      if (args.length === 0) {
        throw new Error('grepCount operation requires a pattern argument');
      }
      
      const pattern = args[0];
      const flags = args[1] || '';
      
      const lines = Array.isArray(value) ? value : String(value).split('\n');
      
      try {
        const regex = new RegExp(pattern, flags);
        return lines.filter(line => regex.test(String(line))).length;
      } catch (err) {
        throw new Error(`grepCount operation: Invalid regex pattern '${pattern}'. ${err.message}`);
      }
    }, true);

    /**
     * grepFirst - Get first line matching a pattern
     * @param {string|array} value - Text to search
     * @param {array} args - [pattern, flags (optional)]
     * @returns {string|null} First matching line or null
     * 
     * Example:
     *   "line1\nError: test\nline3" ~> grepFirst "^Error"  // "Error: test"
     */
    registry.register('grepFirst', (value, args) => {
      if (args.length === 0) {
        throw new Error('grepFirst operation requires a pattern argument');
      }
      
      const pattern = args[0];
      const flags = args[1] || '';
      
      const lines = Array.isArray(value) ? value : String(value).split('\n');
      
      try {
        const regex = new RegExp(pattern, flags);
        const match = lines.find(line => regex.test(String(line)));
        return match !== undefined ? match : null;
      } catch (err) {
        throw new Error(`grepFirst operation: Invalid regex pattern '${pattern}'. ${err.message}`);
      }
    }, true);
  }
}

module.exports = TextOperations;
