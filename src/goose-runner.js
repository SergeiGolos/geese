const CLIRunner = require('./cli-runner');
const GooseProvider = require('./providers/GooseProvider');
const ToolExecutor = require('./ToolExecutor');

class GooseRunner extends CLIRunner {
  constructor() {
    super();
    // Create provider and executor for new architecture
    this._provider = new GooseProvider();
    this._executor = new ToolExecutor(this._provider);
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

  /**
   * Execute goose with the provided prompt and configuration
   * Uses the new executor architecture
   * @param {string} prompt - The prompt to send to goose
   * @param {Object} config - Goose configuration options
   * @returns {Promise<Object>} Response with output and metadata
   */
  async execute(prompt, config = {}) {
    return this._executor.execute(prompt, config);
  }

  /**
   * Process a file with the CLI tool
   * Uses the new executor architecture
   * @param {string} targetFile - Path to target file
   * @param {string} prompt - The generated prompt
   * @param {Object} config - Tool configuration
   * @returns {Promise<Object>} Response with output and metadata
   */
  async processFile(targetFile, prompt, config) {
    return this._executor.processFile(targetFile, prompt, config);
  }

  /**
   * Check if the CLI tool is available
   * Uses the new executor architecture
   * @returns {Promise<boolean>} True if tool is available
   */
  async checkAvailable() {
    return this._executor.checkAvailable();
  }

  /**
   * Execute goose with the provided prompt and configuration (backward compatibility)
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

  /**
   * Get the tool executor (new architecture)
   * @returns {ToolExecutor} Tool executor instance
   */
  getExecutor() {
    return this._executor;
  }

  /**
   * Set the runner type for this tool
   * Enables switching between real, console, file, and memory runners
   * 
   * @param {string} runnerType - Runner type: 'real', 'console', 'file', 'memory'
   * @param {Object} [options] - Runner-specific options
   * @param {string} [options.outputPath] - Output file path (for 'file' runner)
   * @param {Object} [options.mockResponse] - Mock response (for 'memory' runner)
   */
  setRunnerType(runnerType, options = {}) {
    this._executor = ToolExecutor.create(this._provider, runnerType, options);
  }

  /**
   * Override setPath to update both CLIRunner and ToolExecutor
   * @param {string} toolPath - Path to executable
   */
  setPath(toolPath) {
    super.setPath(toolPath);
    this._executor.setPath(toolPath);
  }
}

module.exports = GooseRunner;
