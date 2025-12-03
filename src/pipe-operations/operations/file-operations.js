/**
 * File Operations
 * Built-in file I/O operations
 */

const fs = require('fs-extra');
const path = require('path');
const { InputValidator, SecurityError } = require('../../security/input-validator');

class FileOperations {
  /**
   * @param {Object} fileReadLimiter - Rate limiter for file operations
   */
  constructor(fileReadLimiter) {
    this.fileReadLimiter = fileReadLimiter;
  }

  /**
   * Register all file operations
   * @param {Object} registry - Pipe registry to register operations with
   */
  register(registry) {
    registry.register('readFile', (value, args, context) => {
      const filePath = String(value);
      const encoding = args[0] || 'utf8';
      
      // Apply rate limiting to prevent resource exhaustion
      // Use tryAcquire for synchronous operation - if limit exceeded, throw error
      if (!this.fileReadLimiter.tryAcquire()) {
        throw new Error(`Rate limit exceeded for file read operations. Maximum ${this.fileReadLimiter.maxPerSecond} reads per second.`);
      }
      
      // Resolve relative to geese file directory if context has it
      let resolvedPath = filePath;
      if (context && context._geeseFileDir && !path.isAbsolute(filePath)) {
        resolvedPath = path.resolve(context._geeseFileDir, filePath);
      }
      
      // Validate file path for security (allow traversal for flexibility, but validate patterns)
      try {
        InputValidator.validateFilePath(resolvedPath, { 
          allowAbsolute: true, 
          allowTraversal: true 
        });
      } catch (err) {
        if (err instanceof SecurityError) {
          // Security validation failed - throw a more informative error
          throw new Error(`Security validation failed for file path: ${filePath}. ${err.message}`);
        }
        throw err;
      }
      
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${resolvedPath}`);
      }
      
      return fs.readFileSync(resolvedPath, encoding);
    }, true);

    registry.register('loadFile', (value, args, context) => {
      // Alias for readFile
      return registry.execute('readFile', value, args, context);
    }, true);
  }
}

module.exports = FileOperations;
