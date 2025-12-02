const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.geese');
    this.configFile = path.join(this.configDir, 'config.json');
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
    
    const keys = key.split('.');
    
    // Guard against prototype pollution
    for (const k of keys) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
        throw new Error(`Invalid configuration key: ${key}. Keys cannot contain '__proto__', 'constructor', or 'prototype'.`);
      }
    }
    
    let value = config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, k)) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Set a configuration value
   * @param {string} key - Configuration key (supports dot notation, e.g., 'goose.model')
   * @param {*} value - Configuration value
   */
  async set(key, value) {
    const config = await this.loadConfig();
    
    const keys = key.split('.');
    
    // Guard against prototype pollution by validating all keys
    // This prevents attacks using __proto__, constructor, or prototype
    for (const k of keys) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
        throw new Error(`Invalid configuration key: ${key}. Keys cannot contain '__proto__', 'constructor', or 'prototype'.`);
      }
    }
    
    // Build the nested structure safely
    // Note: All keys have been validated above (lines 97-101), so traversal is safe
    let current = config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      
      // Create nested object if needed, using Object.create(null) for safety
      if (!Object.prototype.hasOwnProperty.call(current, k) || 
          typeof current[k] !== 'object' || 
          Array.isArray(current[k]) || 
          current[k] === null) {
        // Use Object.create(null) to create an object without prototype
        const newObj = Object.create(null);
        Object.defineProperty(current, k, {
          value: newObj,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
      // Safe to traverse because all keys have been validated above
      current = current[k];
    }
    
    // Set the final value using Object.defineProperty
    const finalKey = keys[keys.length - 1];
    Object.defineProperty(current, finalKey, {
      value: value,
      writable: true,
      enumerable: true,
      configurable: true
    });
    
    await this.saveConfig(config);
  }

  /**
   * Delete a configuration value
   * @param {string} key - Configuration key (supports dot notation)
   */
  async delete(key) {
    const config = await this.loadConfig();
    
    const keys = key.split('.');
    
    // Guard against prototype pollution
    for (const k of keys) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
        throw new Error(`Invalid configuration key: ${key}. Keys cannot contain '__proto__', 'constructor', or 'prototype'.`);
      }
    }
    
    let current = config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!Object.prototype.hasOwnProperty.call(current, k) || typeof current[k] !== 'object') {
        return; // Key doesn't exist
      }
      current = current[k];
    }
    
    delete current[keys[keys.length - 1]];
    
    await this.saveConfig(config);
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
}

module.exports = ConfigManager;
