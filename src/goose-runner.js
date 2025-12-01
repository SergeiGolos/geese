const { spawn } = require('child_process');
const path = require('path');

class GooseRunner {
  constructor() {
    this.defaultGoosePath = 'goose'; // Assumes goose is in PATH
  }

  /**
   * Execute goose with the provided prompt and configuration
   * @param {string} prompt - The prompt to send to goose
   * @param {Object} config - Goose configuration options
   * @returns {Promise<Object>} Response with output and metadata
   */
  async executeGoose(prompt, config = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Build goose command arguments
      const args = [];
      
      // Add model if specified
      if (config.model) {
        args.push('--model', config.model);
      }
      
      // Add recipe if specified  
      if (config.recipe) {
        args.push('--recipe', config.recipe);
      }
      
      // Add any additional flags from config
      if (config.flags && Array.isArray(config.flags)) {
        args.push(...config.flags);
      }
      
      // Spawn goose process
      const gooseProcess = spawn(this.defaultGoosePath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });
      
      let stdout = '';
      let stderr = '';
      
      gooseProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      gooseProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      gooseProcess.on('close', (code) => {
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
          reject(new Error(`Goose process exited with code ${code}: ${stderr}`));
        }
      });
      
      gooseProcess.on('error', (error) => {
        reject(new Error(`Failed to start goose process: ${error.message}`));
      });
      
      // Send prompt to goose
      gooseProcess.stdin.write(prompt);
      gooseProcess.stdin.end();
    });
  }

  /**
   * Execute goose for a file context
   * @param {string} targetFile - Path to target file
   * @param {string} prompt - The generated prompt
   * @param {Object} gooseConfig - Goose configuration from .geese file
   * @returns {Promise<Object>} Response with output and metadata
   */
  async processFile(targetFile, prompt, gooseConfig) {
    try {
      const result = await this.executeGoose(prompt, gooseConfig);
      
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
   * Set custom goose path
   * @param {string} goosePath - Path to goose executable
   */
  setGoosePath(goosePath) {
    this.defaultGoosePath = goosePath;
  }

  /**
   * Check if goose is available
   * @returns {Promise<boolean>} True if goose is available
   */
  async checkGoeseAvailable() {
    return new Promise((resolve) => {
      const process = spawn(this.defaultGoosePath, ['--version'], {
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

module.exports = GooseRunner;
