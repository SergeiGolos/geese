const IAIToolProvider = require('../interfaces/IAIToolProvider');

/**
 * Goose tool provider implementation
 * Manages command structure for the Goose AI tool
 * 
 * @class
 * @extends IAIToolProvider
 */
class GooseProvider extends IAIToolProvider {
  /**
   * Get the default executable path for goose
   * @returns {string} Default executable path
   */
  getDefaultPath() {
    return 'goose'; // Assumes goose is in PATH
  }

  /**
   * Get the required frontmatter properties for .geese files
   * @returns {Object} Object with required and optional properties
   */
  getFrontmatterSchema() {
    return {
      required: ['include'],
      optional: ['exclude', 'model', 'provider', 'resume', 'interactive', 'no_session', 'flags']
    };
  }

  /**
   * Get the default frontmatter template for new .geese files
   * @returns {Object} Default frontmatter object
   */
  getDefaultFrontmatter() {
    return {
      include: ['src/**/*.js'],
      exclude: ['node_modules/**', '*.test.js']
    };
  }

  /**
   * Get the default template content for new .geese files
   * @returns {string} Default template content
   */
  getDefaultTemplate() {
    return `Please analyze the following file.

File: {{filename}}
Path: {{filepath}}

Content:
{{content}}

Please provide:
1. Analysis of the code
2. Suggestions for improvement
3. Any issues found`;
  }

  /**
   * Build goose-specific command-line arguments from configuration
   * @param {Object} config - Configuration object
   * @returns {Array} Array of command-line arguments
   */
  buildArgs(config) {
    const args = [];
    
    // Add the run command first (required by goose CLI)
    args.push('run');
    
    // Use stdin for instructions
    args.push('-i', '-');
    
    // Add provider if specified
    if (config.provider) {
      args.push('--provider', config.provider);
    }
    
    // Add model if specified
    if (config.model) {
      args.push('--model', config.model);
    }
    
    // Add resume flag if specified
    if (config.resume) {
      args.push('--resume');
    }
    
    // Add interactive flag if specified
    if (config.interactive) {
      args.push('--interactive');
    }
    
    // Add no-session flag if specified
    if (config.no_session) {
      args.push('--no-session');
    }
    
    // Add any additional flags from config
    if (config.flags && Array.isArray(config.flags)) {
      args.push(...config.flags);
    }
    
    return args;
  }
}

module.exports = GooseProvider;
