const GooseRunner = require('./goose-runner');

/**
 * Registry for CLI tool runners
 * Manages different tool implementations (goose, aider, etc.)
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.registerDefaultTools();
  }

  /**
   * Register default tools
   */
  registerDefaultTools() {
    this.register('goose', GooseRunner);
  }

  /**
   * Register a new tool
   * @param {string} name - Tool name
   * @param {Class} RunnerClass - CLI runner class
   */
  register(name, RunnerClass) {
    this.tools.set(name, RunnerClass);
  }

  /**
   * Get a tool runner instance
   * @param {string} name - Tool name
   * @returns {CLIRunner} Tool runner instance
   */
  getRunner(name) {
    const RunnerClass = this.tools.get(name);
    if (!RunnerClass) {
      throw new Error(`Unknown tool: ${name}. Available tools: ${this.getToolNames().join(', ')}`);
    }
    return new RunnerClass();
  }

  /**
   * Check if a tool is registered
   * @param {string} name - Tool name
   * @returns {boolean} True if tool is registered
   */
  has(name) {
    return this.tools.has(name);
  }

  /**
   * Get list of registered tool names
   * @returns {Array<string>} Array of tool names
   */
  getToolNames() {
    return Array.from(this.tools.keys());
  }
}

// Export class instead of singleton instance
module.exports = ToolRegistry;
