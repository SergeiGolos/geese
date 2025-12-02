/**
 * Pipe Operations Registry
 * Manages pipe operations that can be used in .geese files
 * Operations follow the signature: (value: any, args: string[], context: any) => any
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class PipeOperations {
  constructor() {
    this.operations = new Map();
    this.builtinOperations = new Set();
    this.operationSources = new Map(); // Track where each operation came from
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

  /**
   * Parse and execute a pipe chain
   * @param {string} valueStr - Value string with optional pipes
   * @param {Object} context - Context object
   * @returns {any} Final result after all pipes
   */
  executePipeChain(valueStr, context) {
    // Handle non-string values - just return them as-is
    if (typeof valueStr !== 'string') {
      return valueStr;
    }
    
    // Split on ~> to find pipes
    const parts = valueStr.split('~>');
    
    // First part is the initial value - strip quotes if present
    let value = parts[0].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // If there are no pipes, return the value as-is
    if (parts.length === 1) {
      return value;
    }
    
    // Process each pipe operation
    for (let i = 1; i < parts.length; i++) {
      const pipeStr = parts[i].trim();
      
      // Parse operation name and arguments
      const firstSpace = pipeStr.indexOf(' ');
      let opName, args;
      
      if (firstSpace === -1) {
        opName = pipeStr;
        args = [];
      } else {
        opName = pipeStr.substring(0, firstSpace);
        const argsStr = pipeStr.substring(firstSpace + 1).trim();
        args = this.parseArguments(argsStr);
      }
      
      // Execute the operation
      value = this.execute(opName, value, args, context);
    }
    
    return value;
  }

  /**
   * Register all built-in pipe operations
   */
  registerBuiltinOperations() {
    // String operations
    this.register('trim', (value) => {
      return String(value).trim();
    });

    this.register('substring', (value, args) => {
      const str = String(value);
      const start = parseInt(args[0], 10) || 0;
      const end = args[1] !== undefined ? parseInt(args[1], 10) : undefined;
      return str.substring(start, end);
    });

    this.register('toUpperCase', (value) => {
      return String(value).toUpperCase();
    });

    this.register('toLowerCase', (value) => {
      return String(value).toLowerCase();
    });

    this.register('replace', (value, args) => {
      const str = String(value);
      if (args.length < 2) {
        throw new Error('replace operation requires 2 arguments: pattern and replacement');
      }
      const pattern = args[0];
      const replacement = args[1];
      // Use replaceAll for global replacement
      return str.split(pattern).join(replacement);
    });

    this.register('split', (value, args) => {
      const str = String(value);
      const separator = args[0] || ',';
      return str.split(separator);
    });

    this.register('join', (value, args) => {
      if (!Array.isArray(value)) {
        throw new Error('join operation requires an array');
      }
      const separator = args[0] || ',';
      return value.join(separator);
    });

    // File operations
    // WARNING: readFile does not prevent directory traversal with ../ sequences
    // This is by design to allow flexibility, but be aware of security implications
    this.register('readFile', (value, args, context) => {
      const filePath = String(value);
      const encoding = args[0] || 'utf8';
      
      // Resolve relative to geese file directory if context has it
      let resolvedPath = filePath;
      if (context && context._geeseFileDir && !path.isAbsolute(filePath)) {
        resolvedPath = path.resolve(context._geeseFileDir, filePath);
      }
      
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${resolvedPath}`);
      }
      
      // Note: This allows reading any file the process has access to
      // Directory traversal with ../ is possible
      return fs.readFileSync(resolvedPath, encoding);
    }, true);

    this.register('loadFile', (value, args, context) => {
      // Alias for readFile
      return this.execute('readFile', value, args, context);
    });

    // Regex operations
    this.register('match', (value, args) => {
      const str = String(value);
      if (args.length === 0) {
        throw new Error('match operation requires a pattern argument');
      }
      const pattern = new RegExp(args[0], args[1] || '');
      const matches = str.match(pattern);
      return matches || [];
    });

    this.register('test', (value, args) => {
      const str = String(value);
      if (args.length === 0) {
        throw new Error('test operation requires a pattern argument');
      }
      const pattern = new RegExp(args[0], args[1] || '');
      return pattern.test(str);
    });

    // List operations
    this.register('filter', (value, args) => {
      if (!Array.isArray(value)) {
        throw new Error('filter operation requires an array');
      }
      if (args.length === 0) {
        throw new Error('filter operation requires a pattern argument');
      }
      const pattern = new RegExp(args[0]);
      return value.filter(item => pattern.test(String(item)));
    });

    this.register('map', (value, args) => {
      if (!Array.isArray(value)) {
        throw new Error('map operation requires an array');
      }
      if (args.length === 0) {
        throw new Error('map operation requires a property name');
      }
      const propName = args[0];
      return value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return item[propName];
        }
        return item;
      });
    });

    this.register('select', (value, args) => {
      if (!Array.isArray(value)) {
        throw new Error('select operation requires an array');
      }
      if (args.length === 0) {
        throw new Error('select operation requires an index');
      }
      const index = parseInt(args[0], 10);
      return value[index];
    });

    this.register('first', (value) => {
      if (!Array.isArray(value)) {
        throw new Error('first operation requires an array');
      }
      return value[0];
    });

    this.register('last', (value) => {
      if (!Array.isArray(value)) {
        throw new Error('last operation requires an array');
      }
      return value[value.length - 1];
    });

    this.register('length', (value) => {
      if (Array.isArray(value) || typeof value === 'string') {
        return value.length;
      }
      return 0;
    });

    // Type operations
    this.register('parseJson', (value) => {
      const str = String(value);
      try {
        return JSON.parse(str);
      } catch (err) {
        throw new Error(`parseJson operation: Malformed JSON input. ${err.message}`);
      }
    });

    this.register('stringify', (value, args) => {
      let indent = 2;
      if (args[0]) {
        const parsed = parseInt(args[0], 10);
        indent = isNaN(parsed) ? 2 : parsed;
      }
      return JSON.stringify(value, null, indent);
    });

    this.register('parseYaml', (value) => {
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
    });

    // Number operations
    this.register('parseInt', (value, args) => {
      const radix = args[0] ? parseInt(args[0], 10) : 10;
      return parseInt(String(value), radix);
    });

    this.register('parseFloat', (value) => {
      return parseFloat(String(value));
    });

    // Utility operations
    this.register('default', (value, args) => {
      if (value === null || value === undefined || value === '') {
        return args[0] || '';
      }
      return value;
    });

    this.register('echo', (value) => {
      // Useful for debugging
      console.log('[PIPE DEBUG]', value);
      return value;
    });
  }

  /**
   * Load a custom pipe operation from a file
   * @param {string} filePath - Path to the pipe operation file
   */
  loadCustomPipe(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Custom pipe file not found: ${filePath}`);
    }
    
    const pipeModule = require(filePath);
    
    // Support different export formats
    let pipeFn, pipeName;
    
    if (typeof pipeModule === 'function') {
      // Direct function export
      pipeFn = pipeModule;
      pipeName = path.basename(filePath, '.js');
    } else if (pipeModule.name && typeof pipeModule.fn === 'function') {
      // Named export with fn property
      pipeName = pipeModule.name;
      pipeFn = pipeModule.fn;
    } else if (pipeModule.default && typeof pipeModule.default === 'function') {
      // ES module default export
      pipeFn = pipeModule.default;
      pipeName = path.basename(filePath, '.js');
    } else {
      throw new Error(`Invalid pipe module format in ${filePath}. Must export a function or {name, fn}.`);
    }
    
    this.register(pipeName, pipeFn);
    return pipeName;
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
    // Built-in operations are already loaded
    
    // Load global custom pipes
    const globalPipesDir = path.join(os.homedir(), '.geese', 'pipes');
    await this.loadCustomPipesFromDirectory(globalPipesDir, 'global');
    
    // Load local custom pipes
    const localGeeseDir = this.findLocalGeeseDir(workingDir);
    if (localGeeseDir) {
      const localPipesDir = path.join(localGeeseDir, 'pipes');
      await this.loadCustomPipesFromDirectory(localPipesDir, 'local');
    }
  }

  /**
   * Find local .geese directory by walking up the tree
   * @param {string} startPath - Starting directory
   * @returns {string|null} Path to .geese directory or null
   */
  findLocalGeeseDir(startPath) {
    let currentDir = path.resolve(startPath);
    const root = path.parse(currentDir).root;
    
    while (currentDir !== root) {
      const geeseDir = path.join(currentDir, '.geese');
      if (fs.existsSync(geeseDir)) {
        return geeseDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    return null;
  }

  /**
   * Load custom pipes from a directory
   * @param {string} pipesDir - Directory containing pipe files
   * @param {string} source - Source identifier ('global' or 'local')
   * 
   * Note: Clears require cache to allow pipe reloading. This is primarily
   * useful during development. In production, pipes are typically loaded once
   * at startup. If memory leaks are a concern, consider not clearing the cache
   * or implementing a more sophisticated module reloading strategy.
   */
  async loadCustomPipesFromDirectory(pipesDir, source) {
    if (!(await fs.pathExists(pipesDir))) {
      return;
    }
    
    const files = await fs.readdir(pipesDir);
    
    for (const file of files) {
      if (file.endsWith('.js')) {
        const pipePath = path.join(pipesDir, file);
        try {
          // Clear require cache to allow reloading (only if module exists)
          // NOTE: This can lead to memory leaks in long-running processes.
          // For production use, consider removing this or using a module
          // reloading library like 'decache' or 'require-reload'.
          try {
            const resolvedPath = require.resolve(pipePath);
            delete require.cache[resolvedPath];
          } catch (e) {
            // Module not in cache, which is fine
          }
          
          const pipeName = this.loadCustomPipe(pipePath);
          this.operationSources.set(pipeName, source);
          
          console.log(`Loaded ${source} pipe: ${pipeName}`);
        } catch (error) {
          console.warn(`Warning: Failed to load pipe ${file} from ${source}: ${error.message}`);
        }
      }
    }
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

// Export singleton instance
module.exports = new PipeOperations();
