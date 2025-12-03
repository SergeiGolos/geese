/**
 * Test suite for security modules
 */

const { InputValidator, SecurityError } = require('./src/security/input-validator');
const RateLimiter = require('./src/utils/rate-limiter');
const path = require('path');

// Test counter
let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✓ ${testName}`);
    passed++;
  } else {
    console.error(`✗ ${testName}`);
    failed++;
  }
}

function assertThrows(fn, errorType, testName) {
  try {
    fn();
    console.error(`✗ ${testName} (expected error not thrown)`);
    failed++;
  } catch (err) {
    if (errorType && !(err instanceof errorType)) {
      console.error(`✗ ${testName} (wrong error type: ${err.name})`);
      failed++;
    } else {
      console.log(`✓ ${testName}`);
      passed++;
    }
  }
}

async function assertThrowsAsync(fn, errorType, testName) {
  try {
    await fn();
    console.error(`✗ ${testName} (expected error not thrown)`);
    failed++;
  } catch (err) {
    if (errorType && !(err instanceof errorType)) {
      console.error(`✗ ${testName} (wrong error type: ${err.name})`);
      failed++;
    } else {
      console.log(`✓ ${testName}`);
      passed++;
    }
  }
}

console.log('\n🧪 Running Security Module Tests\n');

// ===== InputValidator Tests =====

// validateObjectPath tests
try {
  const keys = InputValidator.validateObjectPath('user.name');
  assert(keys.length === 2 && keys[0] === 'user' && keys[1] === 'name', 
    'validateObjectPath returns correct keys for valid path');
} catch (err) {
  assert(false, 'validateObjectPath returns correct keys for valid path');
}

assertThrows(
  () => InputValidator.validateObjectPath('__proto__.polluted'),
  SecurityError,
  'validateObjectPath throws SecurityError for __proto__'
);

assertThrows(
  () => InputValidator.validateObjectPath('user.constructor'),
  SecurityError,
  'validateObjectPath throws SecurityError for constructor'
);

assertThrows(
  () => InputValidator.validateObjectPath('prototype.polluted'),
  SecurityError,
  'validateObjectPath throws SecurityError for prototype'
);

assertThrows(
  () => InputValidator.validateObjectPath(''),
  SecurityError,
  'validateObjectPath throws SecurityError for empty string'
);

// validateFilePath tests
try {
  const validPath = InputValidator.validateFilePath('./data.txt');
  assert(validPath === './data.txt', 'validateFilePath allows normal relative path');
} catch (err) {
  assert(false, 'validateFilePath allows normal relative path');
}

try {
  const validPath = InputValidator.validateFilePath('/home/user/data.txt');
  assert(validPath === '/home/user/data.txt', 'validateFilePath allows absolute path by default');
} catch (err) {
  assert(false, 'validateFilePath allows absolute path by default');
}

assertThrows(
  () => InputValidator.validateFilePath('../../../etc/passwd'),
  SecurityError,
  'validateFilePath throws SecurityError for directory traversal'
);

assertThrows(
  () => InputValidator.validateFilePath('/etc/passwd'),
  SecurityError,
  'validateFilePath throws SecurityError for /etc/ access'
);

assertThrows(
  () => InputValidator.validateFilePath('/sys/kernel'),
  SecurityError,
  'validateFilePath throws SecurityError for /sys/ access'
);

assertThrows(
  () => InputValidator.validateFilePath('file<script>.txt'),
  SecurityError,
  'validateFilePath throws SecurityError for invalid characters'
);

try {
  const validPath = InputValidator.validateFilePath('../data.txt', { allowTraversal: true });
  assert(validPath === '../data.txt', 'validateFilePath allows traversal when enabled');
} catch (err) {
  assert(false, 'validateFilePath allows traversal when enabled');
}

assertThrows(
  () => InputValidator.validateFilePath('/home/user/data.txt', { allowAbsolute: false }),
  SecurityError,
  'validateFilePath throws SecurityError when absolute paths disabled'
);

// baseDir validation tests
try {
  const baseDir = '/home/user/project';
  const validPath = InputValidator.validateFilePath('data/file.txt', { baseDir });
  assert(validPath.startsWith(baseDir), 'validateFilePath resolves path within baseDir');
} catch (err) {
  assert(false, 'validateFilePath resolves path within baseDir');
}

assertThrows(
  () => {
    const baseDir = '/home/user/project';
    InputValidator.validateFilePath('../../etc/passwd', { baseDir });
  },
  SecurityError,
  'validateFilePath throws when path escapes baseDir'
);

// sanitizeInput tests
const xssInput = '<script>alert("xss")</script>Hello';
const sanitized = InputValidator.sanitizeInput(xssInput);
assert(!sanitized.includes('<script>') && sanitized.includes('Hello'), 
  'sanitizeInput removes script tags');

const htmlInput = '<div>Hello</div>';
const escapedHtml = InputValidator.sanitizeInput(htmlInput);
assert(escapedHtml.includes('&lt;') && escapedHtml.includes('&gt;'), 
  'sanitizeInput escapes HTML characters');

const eventHandler = '<img onerror="alert(1)" src="x">';
const sanitizedEvent = InputValidator.sanitizeInput(eventHandler);
assert(!sanitizedEvent.includes('onerror'), 
  'sanitizeInput removes event handlers');

const jsProtocol = 'javascript:alert(1)';
const sanitizedJs = InputValidator.sanitizeInput(jsProtocol);
assert(!sanitizedJs.toLowerCase().includes('javascript:'), 
  'sanitizeInput removes javascript: protocol');

// Test with options
const noEscape = InputValidator.sanitizeInput('<b>text</b>', { 
  removeScripts: false, 
  removeEventHandlers: false, 
  escapeHtml: false 
});
assert(noEscape === '<b>text</b>', 
  'sanitizeInput respects options to disable sanitization');

// hasDangerousPatterns tests
assert(InputValidator.hasDangerousPatterns('<script>alert(1)</script>') === true,
  'hasDangerousPatterns detects script tags');

assert(InputValidator.hasDangerousPatterns('javascript:void(0)') === true,
  'hasDangerousPatterns detects javascript: protocol');

assert(InputValidator.hasDangerousPatterns('<div onclick="alert(1)">') === true,
  'hasDangerousPatterns detects event handlers');

assert(InputValidator.hasDangerousPatterns('Hello World') === false,
  'hasDangerousPatterns returns false for safe input');

// validateCommandInput tests
try {
  const safe = InputValidator.validateCommandInput('filename.txt');
  assert(safe === 'filename.txt', 'validateCommandInput allows safe filenames');
} catch (err) {
  assert(false, 'validateCommandInput allows safe filenames');
}

assertThrows(
  () => InputValidator.validateCommandInput('file; rm -rf /'),
  SecurityError,
  'validateCommandInput throws SecurityError for command injection'
);

assertThrows(
  () => InputValidator.validateCommandInput('file | cat'),
  SecurityError,
  'validateCommandInput throws SecurityError for pipe operator'
);

assertThrows(
  () => InputValidator.validateCommandInput('file && echo'),
  SecurityError,
  'validateCommandInput throws SecurityError for && operator'
);

assertThrows(
  () => InputValidator.validateCommandInput('$(whoami)'),
  SecurityError,
  'validateCommandInput throws SecurityError for command substitution'
);

// ===== RateLimiter Tests =====

// Constructor tests
try {
  const limiter = new RateLimiter(50);
  assert(limiter.maxPerSecond === 50, 'RateLimiter constructor sets maxPerSecond');
} catch (err) {
  assert(false, 'RateLimiter constructor sets maxPerSecond');
}

try {
  const limiter = new RateLimiter(100, 200);
  assert(limiter.burstSize === 200, 'RateLimiter constructor accepts custom burstSize');
} catch (err) {
  assert(false, 'RateLimiter constructor accepts custom burstSize');
}

assertThrows(
  () => new RateLimiter(-5),
  Error,
  'RateLimiter throws error for negative rate'
);

assertThrows(
  () => new RateLimiter(0),
  Error,
  'RateLimiter throws error for zero rate'
);

// tryAcquire tests
try {
  const limiter = new RateLimiter(10);
  const acquired = limiter.tryAcquire();
  assert(acquired === true, 'tryAcquire returns true when tokens available');
} catch (err) {
  assert(false, 'tryAcquire returns true when tokens available');
}

try {
  const limiter = new RateLimiter(5);
  // Exhaust all tokens
  for (let i = 0; i < 5; i++) {
    limiter.tryAcquire();
  }
  const acquired = limiter.tryAcquire();
  assert(acquired === false, 'tryAcquire returns false when tokens exhausted');
} catch (err) {
  assert(false, 'tryAcquire returns false when tokens exhausted');
}

// getAvailableTokens tests
try {
  const limiter = new RateLimiter(10);
  const tokens = limiter.getAvailableTokens();
  assert(tokens === 10, 'getAvailableTokens returns initial token count');
} catch (err) {
  assert(false, 'getAvailableTokens returns initial token count');
}

try {
  const limiter = new RateLimiter(10);
  limiter.tryAcquire();
  limiter.tryAcquire();
  const tokens = limiter.getAvailableTokens();
  assert(tokens === 8, 'getAvailableTokens reflects consumed tokens');
} catch (err) {
  assert(false, 'getAvailableTokens reflects consumed tokens');
}

// reset tests
try {
  const limiter = new RateLimiter(10);
  limiter.tryAcquire();
  limiter.tryAcquire();
  limiter.reset();
  const tokens = limiter.getAvailableTokens();
  assert(tokens === 10, 'reset restores token count to burstSize');
} catch (err) {
  assert(false, 'reset restores token count to burstSize');
}

// Async acquire tests
(async () => {
  try {
    const limiter = new RateLimiter(50);
    await limiter.acquire();
    assert(true, 'acquire completes successfully when tokens available');
  } catch (err) {
    assert(false, 'acquire completes successfully when tokens available');
  }
  
  // Token refill test
  try {
    const limiter = new RateLimiter(100); // 100 tokens per second
    // Exhaust tokens
    for (let i = 0; i < 100; i++) {
      limiter.tryAcquire();
    }
    assert(limiter.getAvailableTokens() === 0, 'All tokens exhausted');
    
    // Wait for refill
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms = 10 tokens
    const refilled = limiter.getAvailableTokens();
    assert(refilled >= 9 && refilled <= 11, 'Tokens refill over time (approximately 10 tokens)');
  } catch (err) {
    assert(false, 'Tokens refill over time');
  }
  
  // Test rate limiting behavior
  try {
    const limiter = new RateLimiter(1000); // 1000 ops/sec
    const start = Date.now();
    
    // Perform 10 operations
    for (let i = 0; i < 10; i++) {
      await limiter.acquire();
    }
    
    const elapsed = Date.now() - start;
    assert(elapsed < 100, 'High rate limiter allows fast operations');
  } catch (err) {
    assert(false, 'High rate limiter allows fast operations');
  }
  
  // Test SecurityError class
  try {
    const error = new SecurityError('Test error');
    assert(error.name === 'SecurityError', 'SecurityError has correct name');
    assert(error.message === 'Test error', 'SecurityError has correct message');
    assert(error instanceof Error, 'SecurityError extends Error');
  } catch (err) {
    assert(false, 'SecurityError class works correctly');
  }
  
  // Summary
  console.log('\n==================================================');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('==================================================\n');
  
  if (failed > 0) {
    process.exit(1);
  }
})();
