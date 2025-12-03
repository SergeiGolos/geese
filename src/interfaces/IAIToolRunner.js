/**
 * Interface for AI Tool Runners
 * Handles execution of AI tool commands
 * 
 * Tool runners are responsible for:
 * - Executing commands with given arguments
 * - Providing stdin input
 * - Capturing stdout and stderr output
 * - Handling execution lifecycle
 * 
 * This interface allows for different implementations:
 * - Real process execution
 * - Console logging (dry-run)
 * - File writing (dry-run with file)
 * - In-memory testing
 * 
 * @interface
 */
class IAIToolRunner {
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
   * @returns {boolean} returns.success - Whether execution succeeded
   * @returns {string} returns.stdout - Standard output
   * @returns {string} returns.stderr - Standard error
   * @returns {number} returns.exitCode - Process exit code
   * @returns {number} returns.duration - Execution duration in milliseconds
   * 
   * @throws {Error} If not implemented by subclass
   */
  async execute(executablePath, args, stdin, options = {}) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Check if the tool is available
   * @param {string} executablePath - Path to executable to check
   * @returns {Promise<boolean>} True if tool is available
   * @throws {Error} If not implemented by subclass
   */
  async checkAvailable(executablePath) {
    throw new Error('checkAvailable() must be implemented by subclass');
  }
}

module.exports = IAIToolRunner;
