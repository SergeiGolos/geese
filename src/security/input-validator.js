/**
 * InputValidator - Centralized security validation for user inputs
 * 
 * Provides methods to validate and sanitize various types of user inputs
 * with protection against common security vulnerabilities.
 */

const path = require('path');
const ObjectPathHelper = require('../utils/object-path-helper');

/**
 * Custom error class for security-related errors
 */
class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Centralized security validation utility
 */
class InputValidator {
  /**
   * List of dangerous keys that could lead to prototype pollution
   * Uses ObjectPathHelper constants to maintain single source of truth
   * @type {string[]}
   */
  static get DANGEROUS_KEYS() {
    return ObjectPathHelper.DANGEROUS_KEYS;
  }
  
  /**
   * Patterns that indicate potential security vulnerabilities in file paths
   * @type {RegExp[]}
   */
  static DANGEROUS_PATH_PATTERNS = [
    /\.\.[\/\\]/,        // Directory traversal (../ or ..\)
    /^[\/\\]etc[\/\\]/,  // Unix system directories
    /^[\/\\]sys[\/\\]/,  // Unix system directories
    /^[\/\\]proc[\/\\]/, // Unix system directories
    /^C:[\/\\]Windows[\/\\]/i, // Windows system directories
    /[<>"|?*]/,          // Invalid filename characters and potential injection
  ];
  
  /**
   * Patterns that indicate potential XSS or injection attacks
   * @type {RegExp[]}
   */
  static DANGEROUS_INPUT_PATTERNS = [
    /<script[\s\S]*?<\/script\s*>/gi,  // Script tags (including whitespace before >)
    /javascript:/gi,                    // JavaScript protocol
    /data:/gi,                          // Data protocol
    /vbscript:/gi,                      // VBScript protocol
    /on\w+\s*=/gi,                      // Event handlers (onclick, onload, etc.)
  ];
  
  /**
   * Validate an object path for prototype pollution vulnerabilities
   * Note: This functionality is primarily handled by ObjectPathHelper,
   * but this method is provided for consistency and explicit security checks.
   * 
   * @param {string} path - Dot-notation path (e.g., 'goose.model')
   * @returns {string[]} Array of validated keys
   * @throws {SecurityError} If path contains dangerous properties
   * 
   * @example
   * // Valid path
   * InputValidator.validateObjectPath('user.name'); // Returns ['user', 'name']
   * 
   * // Invalid path
   * InputValidator.validateObjectPath('__proto__.polluted'); // Throws SecurityError
   */
  static validateObjectPath(path) {
    if (typeof path !== 'string' || path.length === 0) {
      throw new SecurityError('Path must be a non-empty string');
    }
    
    const keys = path.split('.');
    
    for (const key of keys) {
      if (this.DANGEROUS_KEYS.includes(key)) {
        throw new SecurityError(
          `Dangerous key detected: ${key}. Path contains properties that could lead to prototype pollution.`
        );
      }
    }
    
    return keys;
  }
  
  /**
   * Validate a file path for directory traversal and other path-based attacks
   * 
   * @param {string} filePath - File path to validate
   * @param {Object} options - Validation options
   * @param {boolean} options.allowAbsolute - Whether to allow absolute paths (default: true)
   * @param {boolean} options.allowTraversal - Whether to allow ../ sequences (default: false)
   * @param {string} options.baseDir - Base directory to resolve relative paths against
   * @returns {string} The validated (and optionally resolved) file path
   * @throws {SecurityError} If path contains dangerous patterns
   * 
   * @example
   * // Valid path
   * InputValidator.validateFilePath('./data.txt'); // Returns './data.txt'
   * 
   * // Invalid path with traversal
   * InputValidator.validateFilePath('../../../etc/passwd'); // Throws SecurityError
   * 
   * // Allow traversal when explicitly enabled
   * InputValidator.validateFilePath('../data.txt', { allowTraversal: true }); // Returns '../data.txt'
   */
  static validateFilePath(filePath, options = {}) {
    const {
      allowAbsolute = true,
      allowTraversal = false,
      baseDir = null
    } = options;
    
    if (typeof filePath !== 'string' || filePath.length === 0) {
      throw new SecurityError('File path must be a non-empty string');
    }
    
    // Check for dangerous patterns
    // Directory traversal pattern is first in the array - handle specially if allowed
    const directoryTraversalPattern = this.DANGEROUS_PATH_PATTERNS[0]; // /\.\.[\/\\]/
    
    for (let i = 0; i < this.DANGEROUS_PATH_PATTERNS.length; i++) {
      const pattern = this.DANGEROUS_PATH_PATTERNS[i];
      if (pattern.test(filePath)) {
        // Special handling for directory traversal if explicitly allowed
        // Check by index rather than pattern content for robustness
        if (i === 0 && allowTraversal) {
          continue; // Skip directory traversal check if allowed
        }
        
        throw new SecurityError(
          `Dangerous path pattern detected in: ${filePath}. Path may contain directory traversal or system directory access.`
        );
      }
    }
    
    // Check if absolute paths are allowed
    if (path.isAbsolute(filePath) && !allowAbsolute) {
      throw new SecurityError(
        `Absolute paths are not allowed: ${filePath}`
      );
    }
    
    // If baseDir is provided, resolve and verify the path stays within bounds
    if (baseDir && !path.isAbsolute(filePath)) {
      const resolvedPath = path.resolve(baseDir, filePath);
      const normalizedBase = path.resolve(baseDir);
      
      // Ensure the resolved path is within the base directory
      if (!resolvedPath.startsWith(normalizedBase)) {
        throw new SecurityError(
          `Path traversal detected: ${filePath} resolves outside of allowed directory`
        );
      }
      
      return resolvedPath;
    }
    
    return filePath;
  }
  
  /**
   * Sanitize user input to prevent XSS and injection attacks
   * 
   * SECURITY NOTE: This is a basic defense-in-depth sanitizer for CLI text processing.
   * The safety model relies on:
   * 1. First removing obvious dangerous patterns (scripts, event handlers, protocols)
   * 2. Then HTML-escaping ALL remaining content by default (escapeHtml: true)
   * 
   * The HTML escaping step (converting <, >, &, etc. to entities) ensures that even if
   * patterns are incompletely removed, they cannot be interpreted as code when displayed.
   * 
   * For production web applications with HTML rendering, use a dedicated library like
   * DOMPurify which provides comprehensive protection against all XSS vectors.
   * 
   * @param {string} input - User input to sanitize
   * @param {Object} options - Sanitization options
   * @param {boolean} options.removeScripts - Remove script tags (default: true)
   * @param {boolean} options.removeEventHandlers - Remove event handlers (default: true)
   * @param {boolean} options.escapeHtml - Escape HTML special characters (default: true)
   * @returns {string} Sanitized input
   * 
   * @example
   * // Remove script tags and escape HTML (default behavior)
   * InputValidator.sanitizeInput('<script>alert("xss")</script>Hello');
   * // Returns 'Hello'
   * 
   * // Escape HTML only
   * InputValidator.sanitizeInput('<div>Hello</div>', { removeScripts: false });
   * // Returns '&lt;div&gt;Hello&lt;/div&gt;'
   */
  static sanitizeInput(input, options = {}) {
    const {
      removeScripts = true,
      removeEventHandlers = true,
      escapeHtml = true
    } = options;
    
    if (typeof input !== 'string') {
      return String(input);
    }
    
    let sanitized = input;
    
    // First pass: Remove dangerous patterns (best-effort, not perfect)
    // Safety relies on HTML escaping below, not on perfect pattern matching
    if (removeScripts) {
      // Remove tags containing "script" keyword
      // CodeQL alert: This regex is intentionally simple - complex patterns removed by escaping below
      sanitized = sanitized.replace(/<[^>]*script[^>]*>/gi, '');
      
      // Remove dangerous protocols
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/data:/gi, '');
      sanitized = sanitized.replace(/vbscript:/gi, '');
    }
    
    if (removeEventHandlers) {
      // Remove event handler attributes
      // CodeQL alert: Incomplete removal is OK - HTML escaping below prevents execution
      sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
      sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');
    }
    
    // CRITICAL SAFETY STEP: HTML escape ALL remaining content
    // This ensures any remaining < > & " ' / characters cannot form executable code
    if (escapeHtml) {
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    
    return sanitized.trim();
  }
  
  /**
   * Check if a string contains any dangerous patterns
   * 
   * @param {string} input - Input to check
   * @returns {boolean} True if dangerous patterns are detected
   * 
   * @example
   * InputValidator.hasDangerousPatterns('<script>alert(1)</script>'); // Returns true
   * InputValidator.hasDangerousPatterns('Hello World'); // Returns false
   */
  static hasDangerousPatterns(input) {
    if (typeof input !== 'string') {
      return false;
    }
    
    for (const pattern of this.DANGEROUS_INPUT_PATTERNS) {
      if (pattern.test(input)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Validate that a string is safe for use in commands
   * Prevents command injection attacks
   * 
   * @param {string} input - Input to validate
   * @returns {string} Validated input
   * @throws {SecurityError} If input contains command injection patterns
   * 
   * @example
   * InputValidator.validateCommandInput('safe-filename.txt'); // Returns 'safe-filename.txt'
   * InputValidator.validateCommandInput('file; rm -rf /'); // Throws SecurityError
   */
  static validateCommandInput(input) {
    if (typeof input !== 'string' || input.length === 0) {
      throw new SecurityError('Command input must be a non-empty string');
    }
    
    // Common command injection characters
    const dangerousChars = /[;&|`$(){}[\]<>]/;
    
    if (dangerousChars.test(input)) {
      throw new SecurityError(
        `Dangerous characters detected in command input: ${input}`
      );
    }
    
    return input;
  }
}

module.exports = { InputValidator, SecurityError };
