/**
 * Config File I/O
 * Handles reading and writing configuration files
 */

const fs = require('fs-extra');
const path = require('path');

class ConfigFileIO {
  /**
   * Ensure config directory exists
   * @param {string} configDir - Configuration directory path
   */
  static async ensureConfigDir(configDir) {
    await fs.ensureDir(configDir);
  }

  /**
   * Load configuration from file
   * @param {string} configFile - Path to config file
   * @returns {Object} Configuration object
   */
  static async loadConfig(configFile) {
    try {
      const configDir = path.dirname(configFile);
      await ConfigFileIO.ensureConfigDir(configDir);
      
      if (await fs.pathExists(configFile)) {
        const content = await fs.readFile(configFile, 'utf8');
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
   * @param {string} configFile - Path to config file
   * @param {Object} config - Configuration object to save
   */
  static async saveConfig(configFile, config) {
    try {
      const configDir = path.dirname(configFile);
      await ConfigFileIO.ensureConfigDir(configDir);
      await fs.writeFile(configFile, JSON.stringify(config, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Error saving config: ${error.message}`);
    }
  }

  /**
   * Load configuration from a specific file (without error throwing)
   * @param {string} configPath - Path to config file
   * @returns {Object} Configuration object
   */
  static async loadConfigFile(configPath) {
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
}

module.exports = ConfigFileIO;
