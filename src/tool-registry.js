const GooseRunner = require('./goose-runner');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const DirectoryWalker = require('./utils/directory-walker');

/**
 * Registry for CLI tool runners
 * Manages different tool implementations (goose, aider, etc.)
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.toolSources = new Map(); // Track where each runner came from
    this.registerDefaultTools();
  }

  /**
   * Register default tools
   */
  registerDefaultTools() {
    this.register('goose', GooseRunner, 'builtin');
  }

  /**
   * Register a new tool
   * @param {string} name - Tool name
   * @param {Class} RunnerClass - CLI runner class
   * @param {string} source - Source of the runner ('builtin', 'global', 'local')
   */
  register(name, RunnerClass, source = 'custom') {
    const existingSource = this.toolSources.get(name);
    
    if (existingSource) {
      // Handle override scenarios
      if (existingSource === 'builtin') {
        console.warn(`Warning: Custom runner "${name}" overrides built-in runner`);
      } else if (existingSource === 'global' && source === 'local') {
        console.log(`Local runner "${name}" overrides global runner`);
      }
    }
    
    this.tools.set(name, RunnerClass);
    this.toolSources.set(name, source);
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

  /**
   * Load a custom runner from a directory
   * @param {string} runnerPath - Path to the runner directory
   * @returns {string|null} Name of loaded runner or null if failed
   */
  loadCustomRunner(runnerPath) {
    if (!fs.existsSync(runnerPath)) {
      throw new Error(`Custom runner directory not found: ${runnerPath}`);
    }

    const indexPath = path.join(runnerPath, 'index.js');
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Runner index.js not found in: ${runnerPath}`);
    }

    // Clear require cache to allow reloading
    try {
      const resolvedPath = require.resolve(indexPath);
      delete require.cache[resolvedPath];
    } catch (e) {
      // Module not in cache, which is fine
    }

    const runnerModule = require(indexPath);
    
    // Validate module exports
    if (!runnerModule.Runner || typeof runnerModule.Runner !== 'function') {
      throw new Error(`Invalid runner module format in ${indexPath}. Must export { Runner, Provider }.`);
    }

    // Get runner name from directory name
    const runnerName = path.basename(runnerPath);
    
    this.register(runnerName, runnerModule.Runner);
    return runnerName;
  }

  /**
   * Initialize runners with hierarchical loading
   * @param {string} workingDir - Current working directory
   */
  async initializeHierarchy(workingDir) {
    // Built-in runners are already loaded
    
    // Load global custom runners
    const globalRunnersDir = path.join(os.homedir(), '.geese', 'runners');
    await this.loadCustomRunnersFromDirectory(globalRunnersDir, 'global');
    
    // Load local custom runners
    const localGeeseDir = this.findLocalGeeseDir(workingDir);
    if (localGeeseDir) {
      const localRunnersDir = path.join(localGeeseDir, 'runners');
      await this.loadCustomRunnersFromDirectory(localRunnersDir, 'local');
    }
  }

  /**
   * Find local .geese directory by walking up the tree
   * @param {string} startPath - Starting directory
   * @returns {string|null} Path to .geese directory or null
   */
  findLocalGeeseDir(startPath) {
    return DirectoryWalker.findGeeseDirectory(startPath);
  }

  /**
   * Load custom runners from a directory
   * @param {string} runnersDir - Directory containing runner directories
   * @param {string} source - Source identifier ('global' or 'local')
   */
  async loadCustomRunnersFromDirectory(runnersDir, source) {
    if (!(await fs.pathExists(runnersDir))) {
      return;
    }
    
    const entries = await fs.readdir(runnersDir);
    
    for (const entry of entries) {
      const runnerPath = path.join(runnersDir, entry);
      const stat = await fs.stat(runnerPath);
      
      if (stat.isDirectory()) {
        try {
          const runnerName = this.loadCustomRunner(runnerPath);
          this.toolSources.set(runnerName, source);
          console.log(`Loaded ${source} runner: ${runnerName}`);
        } catch (error) {
          console.warn(`Warning: Failed to load runner ${entry} from ${source}: ${error.message}`);
        }
      }
    }
  }
}

// Export class instead of singleton instance
module.exports = ToolRegistry;
