const IAIToolRunner = require('../interfaces/IAIToolRunner');

/**
 * Memory runner implementation
 * Stores execution details in memory for unit testing
 * Does not execute actual processes
 * 
 * @class
 * @extends IAIToolRunner
 */
class MemoryRunner extends IAIToolRunner {
  /**
   * Create a MemoryRunner
   * @param {Object} [options] - Configuration options
   * @param {Object} [options.mockResponse] - Mock response to return
   * @param {boolean} [options.mockResponse.success] - Whether execution should succeed
   * @param {string} [options.mockResponse.stdout] - Mock stdout
   * @param {string} [options.mockResponse.stderr] - Mock stderr
   * @param {number} [options.mockResponse.exitCode] - Mock exit code
   */
  constructor(options = {}) {
    super();
    this.mockResponse = options.mockResponse || {
      success: true,
      stdout: 'Mock output',
      stderr: '',
      exitCode: 0
    };
    this.executions = [];
  }

  /**
   * Execute a command by storing it in memory
   * 
   * @param {string} executablePath - Path to executable
   * @param {string[]} args - Command-line arguments
   * @param {string} stdin - Input to send to stdin
   * @param {Object} [options] - Execution options
   * 
   * @returns {Promise<Object>} Execution result
   */
  async execute(executablePath, args, stdin, options = {}) {
    const startTime = Date.now();
    
    // Store execution details
    const execution = {
      executablePath,
      args: [...args],
      stdin,
      options: { ...options },
      timestamp: new Date().toISOString()
    };
    
    this.executions.push(execution);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Return mock response
    return {
      ...this.mockResponse,
      duration
    };
  }

  /**
   * Check if the tool is available (configurable via mock response)
   * @param {string} executablePath - Path to executable to check
   * @returns {Promise<boolean>} Returns mock availability
   */
  async checkAvailable(executablePath) {
    return this.mockResponse.success !== false;
  }

  /**
   * Get all stored executions
   * @returns {Array} Array of execution records
   */
  getExecutions() {
    return [...this.executions];
  }

  /**
   * Get the last execution
   * @returns {Object|null} Last execution record or null
   */
  getLastExecution() {
    return this.executions.length > 0 
      ? this.executions[this.executions.length - 1] 
      : null;
  }

  /**
   * Clear all stored executions
   */
  clearExecutions() {
    this.executions = [];
  }

  /**
   * Set mock response for future executions
   * @param {Object} response - Mock response object
   */
  setMockResponse(response) {
    this.mockResponse = response;
  }

  /**
   * Get execution count
   * @returns {number} Number of executions
   */
  getExecutionCount() {
    return this.executions.length;
  }
}

module.exports = MemoryRunner;
