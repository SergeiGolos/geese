const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const ObjectPathHelper = require('./utils/object-path-helper');
const DirectoryWalker = require('./utils/directory-walker');
const IConfigProvider = require('./interfaces/config-provider');

class ConfigManager extends IConfigProvider {
  constructor() {
    super();
    this.globalConfigDir = path.join(os.homedir(), '.geese');
    this.globalConfigFile = path.join(this.globalConfigDir, 'config.json');
    // Maintain backward compatibility
    this.configDir = this.globalConfigDir;
    this.configFile = this.globalConfigFile;
  }

  /**
   * Ensure config directory exists
   */
  async ensureConfigDir() {
    await fs.ensureDir(this.configDir);
  }

  /**
   * Load configuration from file
   * @returns {Object} Configuration object
   */
  async loadConfig() {
    try {
      await this.ensureConfigDir();
      
      if (await fs.pathExists(this.configFile)) {
        const content = await fs.readFile(this.configFile, 'utf8');
        return JSON.parse(content);
      }
      
      return {};
    } catch (error) {
      console.error(`Error loading config: ${error.message}`);
      return {};
    }
  }

  /**
   * Save configuration to file
   * @param {Object} config - Configuration object to save
   */
  async saveConfig(config) {
    try {
      await this.ensureConfigDir();
      await fs.writeFile(this.configFile, JSON.stringify(config, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Error saving config: ${error.message}`);
    }
  }

  /**
   * Get a configuration value
   * @param {string} key - Configuration key (supports dot notation, e.g., 'goose.model')
   * @returns {*} Configuration value
   */
  async get(key) {
    const config = await this.loadConfig();
    
    if (!key) {
      return config;
    }
    
    return ObjectPathHelper.getNestedValue(config, key);
  }

  /**
   * Set a configuration value
   * @param {string} key - Configuration key (supports dot notation, e.g., 'goose.model')
   * @param {*} value - Configuration value
   */
  async set(key, value) {
    const config = await this.loadConfig();
    ObjectPathHelper.setNestedValue(config, key, value);
    await this.saveConfig(config);
  }

  /**
   * Delete a configuration value
   * @param {string} key - Configuration key (supports dot notation)
   */
  async delete(key) {
    const config = await this.loadConfig();
    ObjectPathHelper.deleteNestedValue(config, key);
    await this.saveConfig(config);
  }

  /**
   * List all configuration keys
   * @returns {Promise<string[]>} Array of configuration keys
   */
  async list() {
    const config = await this.loadConfig();
    return ObjectPathHelper.listKeys(config);
  }

  /**
   * Get configuration for a specific tool
   * @param {string} tool - Tool name (e.g., 'goose', 'aider')
   * @returns {Object} Tool-specific configuration
   */
  async getToolConfig(tool) {
    const config = await this.loadConfig();
    return config[tool] || {};
  }

  /**
   * Set configuration for a specific tool
   * @param {string} tool - Tool name (e.g., 'goose', 'aider')
   * @param {Object} toolConfig - Tool-specific configuration
   */
  async setToolConfig(tool, toolConfig) {
    const config = await this.loadConfig();
    config[tool] = { ...(config[tool] || {}), ...toolConfig };
    await this.saveConfig(config);
  }

  /**
   * Get the config file path
   * @returns {string} Path to config file
   */
  getConfigPath() {
    return this.configFile;
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
   * Load configuration from a specific file
   * @param {string} configPath - Path to config file
   * @returns {Object} Configuration object
   */
  async loadConfigFile(configPath) {
    try {
      if (await fs.pathExists(configPath)) {
        const content = await fs.readFile(configPath, 'utf8');
        return JSON.parse(content);
      }
      return {};
    } catch (error) {
      console.warn(`Warning: Could not load config from ${configPath}: ${error.message}`);
      return {};
    }
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
    const globalConfig = await this.loadConfigFile(this.globalConfigFile);
    sources.global = globalConfig;
    
    // Level 2: Local directory configuration
    let localConfig = {};
    const localConfigDir = this.getLocalConfigDir(workingDir);
    if (localConfigDir) {
      const localConfigFile = path.join(localConfigDir, 'config.json');
      localConfig = await this.loadConfigFile(localConfigFile);
      sources.local = localConfig;
      sources.localConfigDir = localConfigDir;
    }
    
    // Level 3: .geese file configuration
    sources.geese = geeseFileConfig;
    
    // Level 4: Command line arguments
    sources.cli = cliArgs;
    
    // Deep merge all configurations
    const merged = this.deepMerge(
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
   * Deep merge multiple configuration objects
   * Later objects override earlier ones
   * @param {...Object} configs - Configuration objects to merge
   * @returns {Object} Merged configuration
   */
  deepMerge(...configs) {
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
            result[key] = this.deepMerge(result[key] || {}, value);
          } else {
            // Override with new value (includes arrays)
            result[key] = value;
          }
        }
      }
    }
    
    return result;
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

  /**
   * Create local configuration directory
   * @param {string} projectDir - Project directory path
   */
  async createLocalConfig(projectDir) {
    const localConfigDir = path.join(projectDir, '.geese');
    const localConfigFile = path.join(localConfigDir, 'config.json');
    
    await fs.ensureDir(localConfigDir);
    
    if (!(await fs.pathExists(localConfigFile))) {
      const defaultLocalConfig = {
        // Project-specific defaults
        goose: {
          // Will inherit from global, can override here
        }
      };
      
      await fs.writeFile(
        localConfigFile,
        JSON.stringify(defaultLocalConfig, null, 2),
        'utf8'
      );
    }
    
    return localConfigDir;
  }
}

module.exports = ConfigManager;
