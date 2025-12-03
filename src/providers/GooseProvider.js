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
      required: ['include', 'recipe'],
      optional: ['exclude', 'model', 'temperature', 'max_tokens', 'config', 'profile', 'resume', 'log_level', 'no_color', 'flags']
    };
  }

  /**
   * Get the default frontmatter template for new .geese files
   * @returns {Object} Default frontmatter object
   */
  getDefaultFrontmatter() {
    return {
      include: ['src/**/*.js'],
      exclude: ['node_modules/**', '*.test.js'],
      recipe: 'code-review',
      temperature: 0.7,
      max_tokens: 2000
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
    
    // Add the session start command first (required by goose CLI)
    args.push('session', 'start');
    
    // Add config file if specified
    if (config.config) {
      args.push('--config', config.config);
    }
    
    // Add profile if specified
    if (config.profile) {
      args.push('--profile', config.profile);
    }
    
    // Add model if specified
    if (config.model) {
      args.push('--model', config.model);
    }
    
    // Add recipe if specified  
    if (config.recipe) {
      args.push('--recipe', config.recipe);
    }
    
    // Add temperature if specified
    if (config.temperature !== undefined) {
      args.push('--temperature', String(config.temperature));
    }
    
    // Add max_tokens if specified
    if (config.max_tokens !== undefined) {
      args.push('--max-tokens', String(config.max_tokens));
    }
    
    // Add resume session if specified
    if (config.resume) {
      args.push('--resume', config.resume);
    }
    
    // Add log level if specified
    if (config.log_level) {
      args.push('--log-level', config.log_level);
    }
    
    // Add no-color flag if specified
    if (config.no_color === true) {
      args.push('--no-color');
    }
    
    // Add any additional flags from config
    if (config.flags && Array.isArray(config.flags)) {
      args.push(...config.flags);
    }
    
    return args;
  }
}

module.exports = GooseProvider;
