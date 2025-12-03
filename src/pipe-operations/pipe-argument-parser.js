/**
 * Pipe Argument Parser
 * Handles parsing of arguments from pipe operation strings
 */

class PipeArgumentParser {
  /**
   * Parse arguments from a string, respecting quotes
   * @param {string} argsStr - Arguments string
   * @returns {string[]} Array of parsed arguments
   */
  static parseArguments(argsStr) {
    const args = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = null;
    let escaped = false;

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if ((char === '"' || char === "'")) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
          continue;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = null;
          args.push(current);
          current = '';
          continue;
        }
      }

      if (char === ' ' && !inQuotes) {
        if (current) {
          args.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current) {
      args.push(current);
    }

    return args;
  }
}

module.exports = PipeArgumentParser;
