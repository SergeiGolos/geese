/**
 * Pipe Chain Executor
 * Handles parsing and execution of pipe chains (value ~> operation1 ~> operation2)
 */

const PipeArgumentParser = require('./pipe-argument-parser');

class PipeChainExecutor {
  /**
   * @param {Object} pipeRegistry - Reference to the pipe registry for operation lookup
   */
  constructor(pipeRegistry) {
    this.pipeRegistry = pipeRegistry;
  }

  /**
   * Parse and execute a pipe chain
   * @param {string} valueStr - Value string with optional pipes
   * @param {Object} context - Context object
   * @returns {any} Final result after all pipes
   */
  executePipeChain(valueStr, context) {
    // Handle non-string values - just return them as-is
    if (typeof valueStr !== 'string') {
      return valueStr;
    }
    
    // Split on ~> to find pipes
    const parts = valueStr.split('~>');
    
    // First part is the initial value - strip quotes if present
    let value = parts[0].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // If there are no pipes, return the value as-is
    if (parts.length === 1) {
      return value;
    }
    
    // Process each pipe operation
    for (let i = 1; i < parts.length; i++) {
      const pipeStr = parts[i].trim();
      
      // Parse operation name and arguments
      const firstSpace = pipeStr.indexOf(' ');
      let opName, args;
      
      if (firstSpace === -1) {
        opName = pipeStr;
        args = [];
      } else {
        opName = pipeStr.substring(0, firstSpace);
        const argsStr = pipeStr.substring(firstSpace + 1).trim();
        args = PipeArgumentParser.parseArguments(argsStr);
      }
      
      // Execute the operation through the registry
      value = this.pipeRegistry.execute(opName, value, args, context);
    }
    
    return value;
  }
}

module.exports = PipeChainExecutor;
