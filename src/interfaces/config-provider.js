/**
 * Interface for configuration providers
 * Implementations must provide these methods to manage configuration data
 * 
 * @interface IConfigProvider
 */
class IConfigProvider {
  /**
   * Load configuration from the provider
   * @returns {Promise<Object>} Configuration object
   * @throws {Error} If not implemented by subclass
   */
  async loadConfig() {
    throw new Error('loadConfig() must be implemented by subclass');
  }
  
  /**
   * Save configuration to the provider
   * @param {Object} config - Configuration object to save
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass
   */
  async saveConfig(config) {
    throw new Error('saveConfig(config) must be implemented by subclass');
  }
  
  /**
   * Get a configuration value by key path (e.g., 'tools.goose.path')
   * @param {string} key - Dot-separated key path
   * @returns {Promise<*>} Configuration value or undefined
   * @throws {Error} If not implemented by subclass
   */
  async get(key) {
    throw new Error('get(key) must be implemented by subclass');
  }
  
  /**
   * Set a configuration value by key path
   * @param {string} key - Dot-separated key path
   * @param {*} value - Value to set
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass
   */
  async set(key, value) {
    throw new Error('set(key, value) must be implemented by subclass');
  }
  
  /**
   * Delete a configuration value by key path
   * @param {string} key - Dot-separated key path
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by subclass
   */
  async delete(key) {
    throw new Error('delete(key) must be implemented by subclass');
  }
  
  /**
   * List all configuration keys
   * @returns {Promise<string[]>} Array of configuration keys
   * @throws {Error} If not implemented by subclass
   */
  async list() {
    throw new Error('list() must be implemented by subclass');
  }
}

module.exports = IConfigProvider;
