const { spawn } = require('child_process');
const IAIToolRunner = require('../interfaces/IAIToolRunner');

/**
 * Real tool runner implementation
 * Executes actual processes with stdin/stdout/stderr
 * 
 * @class
 * @extends IAIToolRunner
 */
class RealToolRunner extends IAIToolRunner {
  /**
   * Execute a command with given arguments and stdin
   * 
   * @param {string} executablePath - Path to executable
   * @param {string[]} args - Command-line arguments
   * @param {string} stdin - Input to send to stdin
   * @param {Object} [options] - Execution options
   * @param {boolean} [options.realTime] - Whether to stream output in real-time
   * @param {Function} [options.onStdout] - Callback for stdout data
   * @param {Function} [options.onStderr] - Callback for stderr data
   * 
   * @returns {Promise<Object>} Execution result
   */
  async execute(executablePath, args, stdin, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Spawn process
      const childProcess = spawn(executablePath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        
        // Real-time output if requested
        if (options.realTime && options.onStdout) {
          options.onStdout(text);
        }
      });
      
      childProcess.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        
        // Real-time output if requested
        if (options.realTime && options.onStderr) {
          options.onStderr(text);
        }
      });
      
      childProcess.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
          duration
        });
      });
      
      childProcess.on('error', (error) => {
        reject(new Error(`Failed to start process: ${error.message}`));
      });
      
      // Send stdin and close
      if (stdin) {
        childProcess.stdin.write(stdin);
      }
      childProcess.stdin.end();
    });
  }

  /**
   * Check if the tool is available
   * @param {string} executablePath - Path to executable to check
   * @returns {Promise<boolean>} True if tool is available
   */
  async checkAvailable(executablePath) {
    return new Promise((resolve) => {
      const process = spawn(executablePath, ['--version'], {
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

module.exports = RealToolRunner;
