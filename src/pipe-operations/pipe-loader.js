/**
 * Pipe Loader
 * Handles loading custom pipe operations from filesystem
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const DirectoryWalker = require('../utils/directory-walker');

class PipeLoader {
  /**
   * @param {Object} pipeRegistry - Reference to the pipe registry for registration
   */
  constructor(pipeRegistry) {
    this.pipeRegistry = pipeRegistry;
  }

  /**
   * Load a custom pipe operation from a file
   * @param {string} filePath - Path to the pipe operation file
   * @returns {string} Name of the loaded pipe
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
    
    this.pipeRegistry.register(pipeName, pipeFn);
    return pipeName;
  }

  /**
   * Initialize pipe operations with hierarchical loading
   * @param {string} workingDir - Current working directory
   */
  async initializeHierarchy(workingDir) {
    // Load global custom pipes
    const globalPipesDir = path.join(os.homedir(), '.geese', 'pipes');
    await this.loadCustomPipesFromDirectory(globalPipesDir, 'global');
    
    // Load local custom pipes
    const localGeeseDir = DirectoryWalker.findGeeseDirectory(workingDir);
    if (localGeeseDir) {
      const localPipesDir = path.join(localGeeseDir, 'pipes');
      await this.loadCustomPipesFromDirectory(localPipesDir, 'local');
    }
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
            // Module not in require cache, which is expected on first load
          }
          
          const pipeName = this.loadCustomPipe(pipePath);
          this.pipeRegistry.operationSources.set(pipeName, source);
          
          console.log(`Loaded ${source} pipe: ${pipeName}`);
        } catch (error) {
          console.warn(`Warning: Failed to load pipe ${file} from ${source}: ${error.message}`);
        }
      }
    }
  }
}

module.exports = PipeLoader;
