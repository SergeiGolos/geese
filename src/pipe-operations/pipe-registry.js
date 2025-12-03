/**
 * Pipe Registry
 * Central registry for pipe operations with registration and execution
 */

const RateLimiter = require('../utils/rate-limiter');
const PipeChainExecutor = require('./pipe-chain-executor');
const PipeLoader = require('./pipe-loader');
const PipeArgumentParser = require('./pipe-argument-parser');
const BuiltInOperations = require('./built-in-operations');
const FileOperations = require('./operations/file-operations');

class PipeRegistry {
  constructor() {
    this.operations = new Map();
    this.builtinOperations = new Set();
    this.operationSources = new Map(); // Track where each operation came from
    // Rate limiter for file operations (50 reads per second max)
    this.fileReadLimiter = new RateLimiter(50);
    
    // Initialize components
    this.chainExecutor = new PipeChainExecutor(this);
    this.loader = new PipeLoader(this);
    
    // Register built-in operations
    this.registerBuiltinOperations();
  }

  /**
   * Register a pipe operation
   * @param {string} name - Operation name
   * @param {Function} fn - Operation function (value, args, context) => any
   * @param {boolean} isBuiltin - Whether this is a built-in operation
   */
  register(name, fn, isBuiltin = false) {
    if (typeof fn !== 'function') {
      throw new Error(`Pipe operation must be a function, got ${typeof fn}`);
    }
    
    const existingSource = this.operationSources.get(name);
    
    if (isBuiltin) {
      this.builtinOperations.add(name);
      this.operationSources.set(name, 'builtin');
    } else if (this.builtinOperations.has(name)) {
      console.warn(`Warning: Custom pipe "${name}" overrides built-in operation`);
    } else if (existingSource) {
      // Handle override scenarios with consistent messaging
      if (existingSource === 'global') {
        console.log(`Local pipe "${name}" overrides global pipe`);
      } else if (existingSource === 'local') {
        console.warn(`Warning: Pipe "${name}" is being re-registered (local override)`);
      } else {
        console.warn(`Warning: Pipe "${name}" overrides existing ${existingSource} pipe`);
      }
    }
    
    this.operations.set(name, fn);
  }

  /**
   * Get a registered operation
   * @param {string} name - Operation name
   * @returns {Function} Operation function
   */
  get(name) {
    return this.operations.get(name);
  }

  /**
   * Check if operation exists
   * @param {string} name - Operation name
   * @returns {boolean}
   */
  has(name) {
    return this.operations.has(name);
  }

  /**
   * Execute a pipe operation
   * @param {string} name - Operation name
   * @param {any} value - Input value
   * @param {string[]} args - Operation arguments
   * @param {Object} context - Context object with all properties
   * @returns {any} Result of operation
   */
  execute(name, value, args, context) {
    const operation = this.get(name);
    if (!operation) {
      throw new Error(`Pipe operation "${name}" not found`);
    }
    return operation(value, args, context);
  }

  /**
   * Parse arguments from a string, respecting quotes
   * @param {string} argsStr - Arguments string
   * @returns {string[]} Array of parsed arguments
   */
  parseArguments(argsStr) {
    return PipeArgumentParser.parseArguments(argsStr);
  }

  /**
   * Parse and execute a pipe chain
   * @param {string} valueStr - Value string with optional pipes
   * @param {Object} context - Context object
   * @returns {any} Final result after all pipes
   */
  executePipeChain(valueStr, context) {
    return this.chainExecutor.executePipeChain(valueStr, context);
  }

  /**
   * Register all built-in pipe operations
   */
  registerBuiltinOperations() {
    const fileOperations = new FileOperations(this.fileReadLimiter);
    BuiltInOperations.registerAll(this, fileOperations);
  }

  /**
   * Load a custom pipe operation from a file
   * @param {string} filePath - Path to the pipe operation file
   */
  loadCustomPipe(filePath) {
    return this.loader.loadCustomPipe(filePath);
  }

  /**
   * List all registered operations
   * @returns {string[]} Array of operation names
   */
  list() {
    return Array.from(this.operations.keys());
  }

  /**
   * Initialize pipe operations with hierarchical loading
   * @param {string} workingDir - Current working directory
   */
  async initializeHierarchy(workingDir) {
    return this.loader.initializeHierarchy(workingDir);
  }

  /**
   * Get information about a pipe operation
   * @param {string} name - Operation name
   * @returns {Object} Pipe information
   */
  getPipeInfo(name) {
    return {
      name,
      exists: this.has(name),
      source: this.operationSources.get(name) || 'unknown',
      isBuiltin: this.builtinOperations.has(name)
    };
  }

  /**
   * List all operations with their sources
   * @returns {Array} Array of operation info objects
   */
  listWithSources() {
    const operations = [];
    
    for (const name of this.operations.keys()) {
      operations.push(this.getPipeInfo(name));
    }
    
    return operations;
  }
}

module.exports = PipeRegistry;
