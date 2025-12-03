# Security Guidelines

This document describes the security features and best practices for the Geese project.

## Security Modules

### InputValidator

The `InputValidator` class provides centralized security validation for user inputs. It protects against common security vulnerabilities including:

- **Prototype pollution attacks** - Guards against `__proto__`, `constructor`, and `prototype` property access
- **Directory traversal** - Prevents `../` path traversal attacks
- **System directory access** - Blocks access to sensitive system directories like `/etc`, `/sys`, `/proc`
- **XSS attacks** - Sanitizes HTML and script tags from user input
- **Command injection** - Validates input for shell command safety

#### Usage Examples

```javascript
const { InputValidator, SecurityError } = require('./src/security/input-validator');

// Validate object paths (prototype pollution protection)
try {
  const keys = InputValidator.validateObjectPath('user.profile.name');
  console.log('Valid path:', keys); // ['user', 'profile', 'name']
} catch (err) {
  if (err instanceof SecurityError) {
    console.error('Security violation:', err.message);
  }
}

// Validate file paths (directory traversal protection)
try {
  const safePath = InputValidator.validateFilePath('./data/file.txt');
  // File path is safe to use
} catch (err) {
  console.error('Dangerous file path:', err.message);
}

// Validate file paths with base directory constraint
try {
  const safePath = InputValidator.validateFilePath('../data/file.txt', {
    baseDir: '/home/user/project',
    allowTraversal: false
  });
} catch (err) {
  console.error('Path escapes base directory');
}

// Sanitize user input (XSS protection)
const userInput = '<script>alert("xss")</script>Hello';
const sanitized = InputValidator.sanitizeInput(userInput);
console.log(sanitized); // 'Hello'

// Check for dangerous patterns
if (InputValidator.hasDangerousPatterns(userInput)) {
  console.warn('Input contains potentially dangerous patterns');
}

// Validate command input (command injection protection)
try {
  InputValidator.validateCommandInput('filename.txt'); // OK
  InputValidator.validateCommandInput('file; rm -rf /'); // Throws SecurityError
} catch (err) {
  console.error('Command injection attempt detected');
}
```

#### API Reference

##### `validateObjectPath(path: string): string[]`

Validates an object path for prototype pollution vulnerabilities.

- **Parameters:**
  - `path` - Dot-notation path (e.g., 'user.name')
- **Returns:** Array of validated keys
- **Throws:** `SecurityError` if path contains dangerous properties

##### `validateFilePath(filePath: string, options?: object): string`

Validates a file path for directory traversal and other path-based attacks.

- **Parameters:**
  - `filePath` - File path to validate
  - `options` - Validation options:
    - `allowAbsolute` - Whether to allow absolute paths (default: true)
    - `allowTraversal` - Whether to allow `../` sequences (default: false)
    - `baseDir` - Base directory to resolve relative paths against
- **Returns:** The validated (and optionally resolved) file path
- **Throws:** `SecurityError` if path contains dangerous patterns

##### `sanitizeInput(input: string, options?: object): string`

Sanitizes user input to prevent XSS and injection attacks.

- **Parameters:**
  - `input` - User input to sanitize
  - `options` - Sanitization options:
    - `removeScripts` - Remove script tags (default: true)
    - `removeEventHandlers` - Remove event handlers (default: true)
    - `escapeHtml` - Escape HTML special characters (default: true)
- **Returns:** Sanitized input

##### `hasDangerousPatterns(input: string): boolean`

Checks if a string contains any dangerous patterns.

- **Parameters:**
  - `input` - Input to check
- **Returns:** True if dangerous patterns are detected

##### `validateCommandInput(input: string): string`

Validates that a string is safe for use in commands.

- **Parameters:**
  - `input` - Input to validate
- **Returns:** Validated input
- **Throws:** `SecurityError` if input contains command injection patterns

### RateLimiter

The `RateLimiter` class implements token bucket rate limiting to prevent resource exhaustion. It's used to limit the rate of operations like file reads, API calls, etc.

#### Usage Examples

```javascript
const RateLimiter = require('./src/utils/rate-limiter');

// Create a rate limiter for 50 operations per second
const limiter = new RateLimiter(50);

// Async usage (waits if rate limit exceeded)
async function performOperationAsync() {
  await limiter.acquire();
  // Perform operation
  return readFile('./data.txt');
}

// Sync usage (fails fast if rate limit exceeded)
function performOperationSync() {
  if (!limiter.tryAcquire()) {
    throw new Error('Rate limit exceeded');
  }
  // Perform operation
  return readFileSync('./data.txt');
}

// Check available tokens
console.log(`Available tokens: ${limiter.getAvailableTokens()}`);

// Reset the rate limiter
limiter.reset();
```

#### API Reference

##### `constructor(maxPerSecond: number, burstSize?: number)`

Creates a new rate limiter.

- **Parameters:**
  - `maxPerSecond` - Maximum operations allowed per second
  - `burstSize` - Maximum burst size (default: same as maxPerSecond)

##### `acquire(): Promise<void>`

Acquires a token to perform an operation. Waits if no tokens are available.

- **Returns:** Promise that resolves when a token is acquired

##### `tryAcquire(): boolean`

Tries to acquire a token without waiting.

- **Returns:** True if token was acquired, false otherwise

##### `getAvailableTokens(): number`

Gets the current number of available tokens.

- **Returns:** Number of available tokens

##### `reset(): void`

Resets the rate limiter to its initial state.

## Integration with Existing Code

### File Operations

The `readFile` pipe operation in `PipeOperations` now includes:

1. **Rate limiting** - Limits to 50 file reads per second
2. **Security validation** - Validates file paths using `InputValidator`

```javascript
// In pipe-operations.js
class PipeOperations {
  constructor() {
    this.fileReadLimiter = new RateLimiter(50);
  }
  
  // readFile operation with security and rate limiting
  this.register('readFile', (value, args, context) => {
    // Apply rate limiting
    if (!this.fileReadLimiter.tryAcquire()) {
      throw new Error('Rate limit exceeded for file read operations');
    }
    
    // Validate file path
    InputValidator.validateFilePath(resolvedPath, { 
      allowAbsolute: true, 
      allowTraversal: true 
    });
    
    // Read file if validation passes
    return fs.readFileSync(resolvedPath, encoding);
  });
}
```

## Best Practices

### 1. Always Validate User Input

```javascript
// BAD: Direct use of user input
const obj = {};
obj[userInput] = value;

// GOOD: Validate first
const keys = InputValidator.validateObjectPath(userInput);
ObjectPathHelper.setNestedValue(obj, userInput, value);
```

### 2. Use Rate Limiting for Resource-Intensive Operations

```javascript
// BAD: Unlimited file operations
files.forEach(file => readFileSync(file));

// GOOD: Rate limited
const limiter = new RateLimiter(50);
for (const file of files) {
  if (!limiter.tryAcquire()) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  readFileSync(file);
}
```

### 3. Sanitize Output in User-Facing Components

```javascript
// BAD: Direct output
console.log(userInput);

// GOOD: Sanitized output
console.log(InputValidator.sanitizeInput(userInput));
```

### 4. Use Base Directory Constraints

```javascript
// BAD: No path constraints
const file = InputValidator.validateFilePath(userPath);

// GOOD: Constrained to project directory
const file = InputValidator.validateFilePath(userPath, {
  baseDir: '/home/user/project',
  allowTraversal: false
});
```

### 5. Handle SecurityError Appropriately

```javascript
try {
  const safePath = InputValidator.validateFilePath(userPath);
  // Use safePath
} catch (err) {
  if (err instanceof SecurityError) {
    // Log security violation
    logger.warn('Security violation detected', { 
      error: err.message,
      path: userPath,
      user: currentUser
    });
    throw new Error('Invalid input');
  }
  throw err;
}
```

## Security Checklist

When adding new features that involve user input:

- [ ] Validate object paths with `InputValidator.validateObjectPath()`
- [ ] Validate file paths with `InputValidator.validateFilePath()`
- [ ] Sanitize HTML/text output with `InputValidator.sanitizeInput()`
- [ ] Apply rate limiting for resource-intensive operations
- [ ] Use base directory constraints when possible
- [ ] Handle `SecurityError` appropriately
- [ ] Log security violations for monitoring
- [ ] Write tests for security edge cases

## Testing

All security modules have comprehensive test coverage:

- **InputValidator**: 29 tests covering all validation scenarios
- **RateLimiter**: 16 tests covering rate limiting behavior

Run security tests:
```bash
npm test  # Includes test-security.js
```

## Reporting Security Issues

If you discover a security vulnerability, please email [security contact] or create a private security advisory on GitHub.

Do NOT create public issues for security vulnerabilities.
