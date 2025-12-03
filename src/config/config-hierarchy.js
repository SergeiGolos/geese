/**
 * Config Hierarchy
 * Handles hierarchical configuration loading and merging
 */

const path = require('path');
const ConfigFileIO = require('./config-file-io');
const ConfigMerger = require('./config-merger');
const DirectoryWalker = require('../utils/directory-walker');

class ConfigHierarchy {
  /**
   * @param {string} globalConfigFile - Path to global config file
   */
  constructor(globalConfigFile) {
    this.globalConfigFile = globalConfigFile;
  }

  /**
   * Get core default configuration
   * These are the hardcoded defaults built into the application
   * @returns {Object} Core default configuration
   */
  getCoreDefaults() {
    return {
      goose: {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2000,
        recipe: 'default',
        include: ['**/*.js'],
        exclude: ['node_modules/**', '*.test.js', 'dist/**']
      },
      defaultTool: 'goose',
      logLevel: 'info'
    };
  }

  /**
   * Get the local configuration directory for a given path
   * Walks up the directory tree to find .geese directory
   * @param {string} startPath - Starting directory path
   * @returns {string|null} Path to local .geese directory or null
   */
  getLocalConfigDir(startPath) {
    return DirectoryWalker.findGeeseDirectory(startPath);
  }

  /**
   * Load hierarchical configuration
   * Merges configurations from all levels in order of priority
   * @param {string} workingDir - Current working directory
   * @param {Object} geeseFileConfig - Configuration from .geese file frontmatter (optional)
   * @param {Object} cliArgs - Command line arguments (optional)
   * @returns {Object} Merged configuration with metadata
   */
  async loadHierarchicalConfig(workingDir, geeseFileConfig = {}, cliArgs = {}) {
    const sources = {};
    
    // Level 0: Core defaults
    const coreDefaults = this.getCoreDefaults();
    sources.core = coreDefaults;
    
    // Level 1: Global configuration
    const globalConfig = await ConfigFileIO.loadConfigFile(this.globalConfigFile);
    sources.global = globalConfig;
    
    // Level 2: Local directory configuration
    let localConfig = {};
    const localConfigDir = this.getLocalConfigDir(workingDir);
    if (localConfigDir) {
      const localConfigFile = path.join(localConfigDir, 'config.json');
      localConfig = await ConfigFileIO.loadConfigFile(localConfigFile);
      sources.local = localConfig;
      sources.localConfigDir = localConfigDir;
    }
    
    // Level 3: .geese file configuration
    sources.geese = geeseFileConfig;
    
    // Level 4: Command line arguments
    sources.cli = cliArgs;
    
    // Deep merge all configurations
    const merged = ConfigMerger.deepMerge(
      coreDefaults,
      globalConfig,
      localConfig,
      geeseFileConfig,
      cliArgs
    );
    
    return {
      config: merged,
      sources: sources,
      hierarchy: ['core', 'global', 'local', 'geese', 'cli']
    };
  }

  /**
   * Get configuration value with source tracking
   * @param {Object} hierarchicalConfig - Result from loadHierarchicalConfig
   * @param {string} key - Configuration key (dot notation)
   * @returns {Object} Value and source information
   */
  getWithSource(hierarchicalConfig, key) {
    const { config, sources, hierarchy } = hierarchicalConfig;
    
    // Get the actual value
    const value = this.getNestedValue(config, key);
    
    // Find which source provided this value
    let source = 'core';
    for (let i = hierarchy.length - 1; i >= 0; i--) {
      const sourceName = hierarchy[i];
      const sourceConfig = sources[sourceName];
      if (sourceConfig && this.hasNestedValue(sourceConfig, key)) {
        source = sourceName;
        break;
      }
    }
    
    return {
      value,
      source,
      key
    };
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to search
   * @param {string} key - Key in dot notation (e.g., 'goose.model')
   * @returns {*} Value or undefined
   */
  getNestedValue(obj, key) {
    const keys = key.split('.');
    let current = obj;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Check if object has nested key
   * @param {Object} obj - Object to check
   * @param {string} key - Key in dot notation
   * @returns {boolean}
   */
  hasNestedValue(obj, key) {
    return this.getNestedValue(obj, key) !== undefined;
  }
}

module.exports = ConfigHierarchy;
