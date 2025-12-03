const RealToolRunner = require('./runners/RealToolRunner');
const ConsoleLoggerRunner = require('./runners/ConsoleLoggerRunner');
const FileWriterRunner = require('./runners/FileWriterRunner');
const MemoryRunner = require('./runners/MemoryRunner');

/**
 * Tool executor that combines provider (command structure) and runner (execution)
 * Provides backward compatibility with CLIRunner while using new architecture
 * 
 * @class
 */
class ToolExecutor {
  /**
   * Create a ToolExecutor
   * @param {IAIToolProvider} provider - Tool provider for command structure
   * @param {IAIToolRunner} [runner] - Tool runner for execution (default: RealToolRunner)
   */
  constructor(provider, runner = null) {
    this.provider = provider;
    this.runner = runner || new RealToolRunner();
    this.customPath = null;
  }

  /**
   * Get the default executable path for this CLI tool
   * @returns {string} Default executable path
   */
  getDefaultPath() {
    return this.provider.getDefaultPath();
  }

  /**
   * Get the required frontmatter properties for .geese files
   * @returns {Object} Object with required and optional properties
   */
  getFrontmatterSchema() {
    return this.provider.getFrontmatterSchema();
  }

  /**
   * Get the default frontmatter template for new .geese files
   * @returns {Object} Default frontmatter object
   */
  getDefaultFrontmatter() {
    return this.provider.getDefaultFrontmatter();
  }

  /**
   * Get the default template content for new .geese files
   * @returns {string} Default template content
   */
  getDefaultTemplate() {
    return this.provider.getDefaultTemplate();
  }

  /**
   * Build command-line arguments from configuration
   * @param {Object} config - Configuration object
   * @returns {Array} Array of command-line arguments
   */
  buildArgs(config) {
    return this.provider.buildArgs(config);
  }

  /**
   * Execute the CLI tool with the provided prompt and configuration
   * @param {string} prompt - The prompt to send to the tool
   * @param {Object} config - Tool configuration options
   * @returns {Promise<Object>} Response with output and metadata
   */
  async execute(prompt, config = {}) {
    const executablePath = this.customPath || this.provider.getDefaultPath();
    const args = this.provider.buildArgs(config);
    
    const result = await this.runner.execute(executablePath, args, prompt, {
      realTime: true,
      onStdout: (data) => {
        if (process.stdout.isTTY) {
          process.stdout.write(data);
        }
      },
      onStderr: (data) => {
        if (process.stderr.isTTY) {
          process.stderr.write(data);
        }
      }
    });
    
    return {
      success: result.success,
      output: result.stdout,
      error: result.stderr,
      duration: result.duration,
      exitCode: result.exitCode
    };
  }

  /**
   * Process a file with the CLI tool
   * @param {string} targetFile - Path to target file
   * @param {string} prompt - The generated prompt
   * @param {Object} config - Tool configuration
   * @returns {Promise<Object>} Response with output and metadata
   */
  async processFile(targetFile, prompt, config) {
    try {
      const result = await this.execute(prompt, config);
      
      return {
        ...result,
        targetFile,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        targetFile,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Set custom path for the CLI tool
   * @param {string} toolPath - Path to executable
   */
  setPath(toolPath) {
    this.customPath = toolPath;
  }

  /**
   * Check if the CLI tool is available
   * @returns {Promise<boolean>} True if tool is available
   */
  async checkAvailable() {
    const executablePath = this.customPath || this.provider.getDefaultPath();
    return this.runner.checkAvailable(executablePath);
  }

  /**
   * Set the runner to use for execution
   * @param {IAIToolRunner} runner - Runner instance
   */
  setRunner(runner) {
    this.runner = runner;
  }

  /**
   * Get the current runner
   * @returns {IAIToolRunner} Current runner
   */
  getRunner() {
    return this.runner;
  }

  /**
   * Create a ToolExecutor with a specific runner type
   * @param {IAIToolProvider} provider - Tool provider
   * @param {string} runnerType - Runner type: 'real', 'console', 'file', 'memory'
   * @param {Object} [options] - Runner-specific options
   * @returns {ToolExecutor} New ToolExecutor instance
   */
  static create(provider, runnerType = 'real', options = {}) {
    let runner;
    
    switch (runnerType) {
      case 'console':
        runner = new ConsoleLoggerRunner();
        break;
      case 'file':
        if (!options.outputPath) {
          throw new Error('outputPath is required for file runner');
        }
        runner = new FileWriterRunner(options.outputPath);
        break;
      case 'memory':
        runner = new MemoryRunner(options);
        break;
      case 'real':
      default:
        runner = new RealToolRunner();
        break;
    }
    
    return new ToolExecutor(provider, runner);
  }
}

module.exports = ToolExecutor;
