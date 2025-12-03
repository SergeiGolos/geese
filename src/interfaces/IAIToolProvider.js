/**
 * Interface for AI Tool Providers
 * Manages how commands are structured for AI tools
 * 
 * Tool providers are responsible for:
 * - Defining frontmatter schema
 * - Building command-line arguments
 * - Providing default templates and configurations
 * 
 * @interface
 */
class IAIToolProvider {
  /**
   * Get the required frontmatter properties for .geese files
   * @returns {Object} Object with required and optional properties
   * @returns {string[]} returns.required - Required field names
   * @returns {string[]} returns.optional - Optional field names
   * @throws {Error} If not implemented by subclass
   */
  getFrontmatterSchema() {
    throw new Error('getFrontmatterSchema() must be implemented by subclass');
  }

  /**
   * Get the default frontmatter template for new .geese files
   * @returns {Object} Default frontmatter object
   * @throws {Error} If not implemented by subclass
   */
  getDefaultFrontmatter() {
    throw new Error('getDefaultFrontmatter() must be implemented by subclass');
  }

  /**
   * Get the default template content for new .geese files
   * @returns {string} Default template content
   * @throws {Error} If not implemented by subclass
   */
  getDefaultTemplate() {
    throw new Error('getDefaultTemplate() must be implemented by subclass');
  }

  /**
   * Build command-line arguments from configuration
   * @param {Object} config - Configuration object
   * @returns {string[]} Array of command-line arguments
   * @throws {Error} If not implemented by subclass
   */
  buildArgs(config) {
    throw new Error('buildArgs() must be implemented by subclass');
  }

  /**
   * Get the default executable path for this tool
   * @returns {string} Default executable path
   * @throws {Error} If not implemented by subclass
   */
  getDefaultPath() {
    throw new Error('getDefaultPath() must be implemented by subclass');
  }
}

module.exports = IAIToolProvider;
