/**
 * Config Manager
 * Orchestrates configuration loading, saving, and hierarchical merging
 */

const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const ObjectPathHelper = require('../utils/object-path-helper');
const ConfigFileIO = require('./config-file-io');
const ConfigHierarchy = require('./config-hierarchy');
const IConfigProvider = require('../interfaces/config-provider');

class ConfigManager extends IConfigProvider {
  constructor() {
    super();
    this.globalConfigDir = path.join(os.homedir(), '.geese');
    this.globalConfigFile = path.join(this.globalConfigDir, 'config.json');
    // Maintain backward compatibility
    this.configDir = this.globalConfigDir;
    this.configFile = this.globalConfigFile;
    
    // Initialize hierarchy component
    this.hierarchy = new ConfigHierarchy(this.globalConfigFile);
  }

  /**
   * Ensure config directory exists
   */
  async ensureConfigDir() {
    await ConfigFileIO.ensureConfigDir(this.configDir);
  }

  /**
   * Load configuration from file
   * @returns {Object} Configuration object
   */
  async loadConfig() {
    return ConfigFileIO.loadConfig(this.configFile);
  }

  /**
   * Save configuration to file
   * @param {Object} config - Configuration object to save
   */
  async saveConfig(config) {
    return ConfigFileIO.saveConfig(this.configFile, config);
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
    return this.hierarchy.getLocalConfigDir(startPath);
  }

  /**
   * Load configuration from a specific file
   * @param {string} configPath - Path to config file
   * @returns {Object} Configuration object
   */
  async loadConfigFile(configPath) {
    return ConfigFileIO.loadConfigFile(configPath);
  }

  /**
   * Get core default configuration
   * These are the hardcoded defaults built into the application
   * @returns {Object} Core default configuration
   */
  getCoreDefaults() {
    return this.hierarchy.getCoreDefaults();
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
    return this.hierarchy.loadHierarchicalConfig(workingDir, geeseFileConfig, cliArgs);
  }

  /**
   * Deep merge multiple configuration objects (exposed for backward compatibility)
   * @param {...Object} configs - Configuration objects to merge
   * @returns {Object} Merged configuration
   */
  deepMerge(...configs) {
    const ConfigMerger = require('./config-merger');
    return ConfigMerger.deepMerge(...configs);
  }

  /**
   * Get configuration value with source tracking
   * @param {Object} hierarchicalConfig - Result from loadHierarchicalConfig
   * @param {string} key - Configuration key (dot notation)
   * @returns {Object} Value and source information
   */
  getWithSource(hierarchicalConfig, key) {
    return this.hierarchy.getWithSource(hierarchicalConfig, key);
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to search
   * @param {string} key - Key in dot notation (e.g., 'goose.model')
   * @returns {*} Value or undefined
   */
  getNestedValue(obj, key) {
    return this.hierarchy.getNestedValue(obj, key);
  }

  /**
   * Check if object has nested key
   * @param {Object} obj - Object to check
   * @param {string} key - Key in dot notation
   * @returns {boolean}
   */
  hasNestedValue(obj, key) {
    return this.hierarchy.hasNestedValue(obj, key);
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
