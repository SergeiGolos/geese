const IAIToolProvider = require('../interfaces/IAIToolProvider');

/**
 * Gemini tool provider implementation
 * Manages command structure for the Google Gemini AI tool
 * 
 * @class
 * @extends IAIToolProvider
 */
class GeminiProvider extends IAIToolProvider {
  /**
   * Get the default executable path for gemini
   * @returns {string} Default executable path
   */
  getDefaultPath() {
    return 'gemini'; // Assumes gemini is in PATH
  }

  /**
   * Get the required frontmatter properties for .geese files
   * @returns {Object} Object with required and optional properties
   */
  getFrontmatterSchema() {
    return {
      required: ['include'],
      optional: [
        'exclude',
        'model',
        'temperature',
        'max_tokens',
        'output_format',
        'stream',
        'tools_enabled',
        'tool_timeout',
        'safe_mode',
        'log_level',
        'flags'
      ]
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
      model: 'gemini-pro',
      temperature: 0.7,
      max_tokens: 2048
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
   * Build gemini-specific command-line arguments from configuration
   * @param {Object} config - Configuration object
   * @returns {Array} Array of command-line arguments
   */
  buildArgs(config) {
    const args = [];
    
    // Use stdin for instructions (similar to goose pattern)
    args.push('-i', '-');
    
    // Add model
    if (config.model) {
      args.push('--model', config.model);
    }
    
    // Add temperature
    if (config.temperature !== undefined) {
      args.push('--temperature', String(config.temperature));
    }
    
    // Add max tokens
    if (config.max_tokens) {
      args.push('--max-tokens', String(config.max_tokens));
    }
    
    // Add output format
    if (config.output_format) {
      args.push('--output-format', config.output_format);
    }
    
    // Add streaming
    if (config.stream !== undefined) {
      args.push('--stream', String(config.stream));
    }
    
    // Add tools enabled
    if (config.tools_enabled !== undefined) {
      args.push('--tools-enabled', String(config.tools_enabled));
    }
    
    // Add tool timeout
    if (config.tool_timeout) {
      args.push('--tool-timeout', String(config.tool_timeout));
    }
    
    // Add safe mode
    if (config.safe_mode !== undefined) {
      args.push('--safe-mode', String(config.safe_mode));
    }
    
    // Add log level
    if (config.log_level) {
      args.push('--log-level', config.log_level);
    }
    
    // Add any additional flags from config
    if (config.flags && Array.isArray(config.flags)) {
      args.push(...config.flags);
    }
    
    return args;
  }
}

module.exports = GeminiProvider;
