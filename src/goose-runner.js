const CLIRunner = require('./cli-runner');

class GooseRunner extends CLIRunner {
  constructor() {
    super();
  }

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
      optional: ['exclude', 'model', 'temperature', 'max_tokens', 'flags']
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
    
    // Add any additional flags from config
    if (config.flags && Array.isArray(config.flags)) {
      args.push(...config.flags);
    }
    
    return args;
  }

  /**
   * Execute goose with the provided prompt and configuration
   * @param {string} prompt - The prompt to send to goose
   * @param {Object} config - Goose configuration options
   * @returns {Promise<Object>} Response with output and metadata
   */
  async executeGoose(prompt, config = {}) {
    return this.execute(prompt, config);
  }

  /**
   * Set custom goose path (for backward compatibility)
   * @param {string} goosePath - Path to goose executable
   */
  setGoosePath(goosePath) {
    this.setPath(goosePath);
  }

  /**
   * Check if goose is available (for backward compatibility)
   * @returns {Promise<boolean>} True if goose is available
   */
  async checkGoeseAvailable() {
    return this.checkAvailable();
  }
}

module.exports = GooseRunner;
