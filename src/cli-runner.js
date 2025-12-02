const { spawn } = require('child_process');

/**
 * Abstract base class for CLI tool runners
 * Extend this class to create runners for specific tools (goose, aider, etc.)
 */
class CLIRunner {
  constructor() {
    if (this.constructor === CLIRunner) {
      throw new Error(
        `CLIRunner is an abstract class and cannot be instantiated directly. ` +
        `Please extend this class and implement the required methods: ` +
        `getDefaultPath(), getFrontmatterSchema(), getDefaultFrontmatter(), getDefaultTemplate(), and optionally buildArgs().`
      );
    }
    this.defaultPath = this.getDefaultPath();
  }

  /**
   * Get the default executable path for this CLI tool
   * Must be implemented by subclasses
   * @returns {string} Default executable path
   */
  getDefaultPath() {
    throw new Error('getDefaultPath() must be implemented by subclass');
  }

  /**
   * Get the required frontmatter properties for .geese files
   * Must be implemented by subclasses
   * @returns {Object} Object with required and optional properties
   */
  getFrontmatterSchema() {
    throw new Error('getFrontmatterSchema() must be implemented by subclass');
  }

  /**
   * Get the default frontmatter template for new .geese files
   * Must be implemented by subclasses
   * @returns {Object} Default frontmatter object
   */
  getDefaultFrontmatter() {
    throw new Error('getDefaultFrontmatter() must be implemented by subclass');
  }

  /**
   * Get the default template content for new .geese files
   * Must be implemented by subclasses
   * @returns {string} Default template content
   */
  getDefaultTemplate() {
    throw new Error('getDefaultTemplate() must be implemented by subclass');
  }

  /**
   * Execute the CLI tool with the provided prompt and configuration
   * @param {string} prompt - The prompt to send to the tool
   * @param {Object} config - Tool configuration options
   * @returns {Promise<Object>} Response with output and metadata
   */
  async execute(prompt, config = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Build command arguments
      const args = this.buildArgs(config);
      
      // Spawn process
      const childProcess = spawn(this.defaultPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      childProcess.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        if (code === 0) {
          resolve({
            success: true,
            output: stdout.trim(),
            error: stderr.trim(),
            duration,
            exitCode: code
          });
        } else {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        }
      });
      
      childProcess.on('error', (error) => {
        reject(new Error(`Failed to start process: ${error.message}`));
      });
      
      // Send prompt to process
      childProcess.stdin.write(prompt);
      childProcess.stdin.end();
    });
  }

  /**
   * Build command-line arguments from configuration
   * Can be overridden by subclasses for tool-specific argument handling
   * @param {Object} config - Configuration object
   * @returns {Array} Array of command-line arguments
   */
  buildArgs(config) {
    const args = [];
    
    // Default implementation - subclasses should override
    for (const [key, value] of Object.entries(config)) {
      if (Array.isArray(value)) {
        args.push(...value);
      } else if (typeof value === 'boolean' && value) {
        args.push(`--${key}`);
      } else {
        args.push(`--${key}`, String(value));
      }
    }
    
    return args;
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
    this.defaultPath = toolPath;
  }

  /**
   * Check if the CLI tool is available
   * @returns {Promise<boolean>} True if tool is available
   */
  async checkAvailable() {
    return new Promise((resolve) => {
      const process = spawn(this.defaultPath, ['--version'], {
        stdio: 'pipe',
        shell: true
      });
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }
}

module.exports = CLIRunner;
