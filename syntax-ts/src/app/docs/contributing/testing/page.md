---
title: "Testing Guide"
nextjs:
  metadata:
    title: "Testing Guide"
    description: "Documentation for Testing Guide"
---

**Version:** 1.0.0
**Last Updated:** 2024-12-03
**Status:** Complete

This guide describes the testing methodologies, conventions, and practices used in the Geese project. It provides a comprehensive overview of how each class and module is tested.

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Infrastructure](#test-infrastructure)
3. [Testing by Class](#testing-by-class)
4. [Testing Conventions](#testing-conventions)
5. [Running Tests](#running-tests)
6. [Writing New Tests](#writing-new-tests)
7. [Test Coverage](#test-coverage)

---

## Testing Philosophy

The Geese project follows these testing principles:

### Core Principles

1. **Simple and Fast** - Uses lightweight custom test framework, no heavy dependencies
2. **Unit-Focused** - Tests individual units of functionality in isolation
3. **Integration Where Needed** - CLI tests validate end-to-end workflows
4. **Comprehensive Coverage** - 267 tests covering all major functionality
5. **Deterministic** - Tests are predictable and don't rely on external services
6. **Self-Documenting** - Test names clearly describe what they test

### Test Categories

- **Unit Tests** - Test individual functions, classes, and methods
- **Integration Tests** - Test CLI commands and workflows end-to-end
- **Interface Tests** - Validate interface contracts are enforced
- **Security Tests** - Ensure security mechanisms work correctly

---

## Test Infrastructure

### Custom Test Framework

The project uses a lightweight custom test framework instead of Jest/Mocha:

```javascript
// Basic test structure
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
    failed++;
  } catch (err) {
    if (errorType && !(err instanceof errorType)) {
      failed++;
    } else {
      passed++;
    }
  }
}
```

### Benefits

- **Zero external dependencies** for testing
- **Fast execution** - No framework overhead
- **Simple debugging** - Straightforward control flow
- **Easy to understand** - No magic or hidden behavior
- **CI/CD friendly** - Runs anywhere Node.js runs

### Test Files

```
test-cli.js              - CLI command integration tests (22 tests)
test-pipes.js            - Pipe operations unit tests (33 tests)
test-schema-validator.js - Schema validation unit tests (15 tests)
test-interfaces.js       - Interface contract tests (32 tests)
test-container.js        - DI container unit tests (24 tests)
test-event-emitter.js    - Event system unit tests (36 tests)
test-security.js         - Security module tests (45 tests)
test-runners.js          - Runner architecture tests (60 tests)
```

---

## Testing by Class

### 1. CLI Integration Tests (`test-cli.js`)

**Class/Module Tested:** `bin/geese.js` and command handlers

**Testing Methodology:**
- **Integration Testing** - Spawns actual CLI process using `execSync`
- **File System Interaction** - Creates temporary directories and files
- **Configuration Testing** - Validates config read/write operations
- **Command Validation** - Tests each CLI command independently

**Key Test Patterns:**

```javascript
// Pattern 1: Command execution
test('geese --help shows help', () => {
  const output = exec(`node ${GEESE_BIN} --help`);
  if (!output.includes('Usage:')) {
    throw new Error('Help output missing');
  }
});

// Pattern 2: File creation
test('geese new creates .geese file', () => {
  exec(`node ${GEESE_BIN} new test-file`);
  if (!fs.existsSync('.geese/test-file.geese')) {
    throw new Error('File not created');
  }
});

// Pattern 3: Configuration management
test('geese config --set works', () => {
  exec(`node ${GEESE_BIN} config --set test.key "value"`);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (config.test.key !== 'value') {
    throw new Error('Config not set');
  }
});
```

**Test Coverage:**
- Help command output
- Version command output
- Config set/get/list/delete operations
- New file creation in default and custom directories
- Error handling for invalid commands
- File system state validation

**Cleanup Strategy:**
- Removes test directories and config before/after tests
- Uses temporary directories (`/tmp/geese-cli-test`)
- Restores original state

---

### 2. Pipe Operations Tests (`test-pipes.js`)

**Class/Module Tested:** `src/pipe-operations.js`

**Testing Methodology:**
- **Unit Testing** - Tests each pipe operation independently
- **Chain Testing** - Validates pipe chains work correctly
- **Edge Case Testing** - Tests boundary conditions and errors
- **Custom Pipe Testing** - Tests loading custom operations

**Key Test Patterns:**

```javascript
// Pattern 1: Single operation
test('trim operation', () => {
  const result = pipeOps.executePipeChain('  hello  ', {});
  assert(result === 'hello', 'Should trim whitespace');
});

// Pattern 2: Pipe chain
test('pipe chain', () => {
  const value = 'test ~> toUpperCase ~> trim';
  const result = pipeOps.executePipeChain(value, {});
  assert(result === 'TEST', 'Should execute chain');
});

// Pattern 3: Arguments
test('substring with args', () => {
  const value = 'hello ~> substring 0 3';
  const result = pipeOps.executePipeChain(value, {});
  assert(result === 'hel', 'Should pass arguments');
});

// Pattern 4: Context access
test('context variables', () => {
  const value = '{{name}} ~> toUpperCase';
  const context = { name: 'test' };
  const result = pipeOps.executePipeChain(value, context);
  assert(result === 'TEST', 'Should use context');
});
```

**Operations Tested:**
- **String Operations:** trim, toUpperCase, toLowerCase, substring, replace, split, join
- **List Operations:** first, last, filter, map, sort
- **Type Operations:** parseJson, stringify, toNumber
- **Regex Operations:** match, test
- **File Operations:** readFile, loadFile
- **Utility Operations:** default, echo

**Edge Cases:**
- Empty strings
- Null/undefined values
- Invalid arguments
- Type coercion
- Error propagation

---

### 3. Schema Validator Tests (`test-schema-validator.js`)

**Class/Module Tested:** `src/utils/schema-validator.js`

**Testing Methodology:**
- **Unit Testing** - Tests validation logic independently
- **Type Validation** - Tests each supported type
- **Field Variants** - Tests $prefix and non-prefixed fields
- **Error Scenarios** - Tests validation failures

**Key Test Patterns:**

```javascript
// Pattern 1: Valid data
test('valid data passes', () => {
  const schema = { required: ['name'], optional: ['age'] };
  const data = { name: 'John', age: 30 };
  const result = SchemaValidator.validate(data, schema);
  assert(result.valid === true, 'Should be valid');
});

// Pattern 2: Missing required field
test('missing required field fails', () => {
  const schema = { required: ['name'] };
  const data = { age: 30 };
  const result = SchemaValidator.validate(data, schema);
  assert(result.valid === false, 'Should be invalid');
  assert(result.errors.length > 0, 'Should have errors');
});

// Pattern 3: Type validation
test('type validation', () => {
  const schema = {
    required: ['name'],
    types: { name: 'string' }
  };
  const data = { name: 123 };
  const result = SchemaValidator.validate(data, schema);
  assert(result.valid === false, 'Should fail type check');
});

// Pattern 4: Field variants
test('$prefix and non-prefix fields', () => {
  const value = SchemaValidator.getFieldValue(
    { $include: ['*.js'], include: ['*.ts'] },
    'include',
    true
  );
  assert(value.length === 1, 'Should get $include first');
  assert(value[0] === '*.js', 'Should prefer $prefix');
});
```

**Types Tested:**
- `string` - String validation
- `array` - Array validation
- `number` - Numeric validation
- `boolean` - Boolean validation
- `object` - Object validation

**Features Tested:**
- Required field validation
- Optional field handling
- Type enforcement
- Field variant resolution ($prefix priority)
- Error message formatting

---

### 4. Interface Tests (`test-interfaces.js`)

**Classes/Modules Tested:** All interface classes in `src/interfaces/`

**Testing Methodology:**
- **Contract Testing** - Ensures interfaces throw when not implemented
- **Implementation Testing** - Validates concrete implementations
- **Type Safety** - Ensures proper inheritance

**Key Test Patterns:**

```javascript
// Pattern 1: Interface method throws
test('IConfigProvider.get() throws if not implemented', () => {
  const provider = new IConfigProvider();
  assertThrows(
    () => provider.get('key'),
    Error,
    'Should throw if not implemented'
  );
});

// Pattern 2: Implementation works
test('ConfigManager implements IConfigProvider', () => {
  const manager = new ConfigManager();
  assert(manager instanceof IConfigProvider, 'Should extend interface');
});

// Pattern 3: All methods throw
test('All IAIToolProvider methods throw', () => {
  const provider = new IAIToolProvider();
  assertThrows(() => provider.getFrontmatterSchema(), Error);
  assertThrows(() => provider.getDefaultFrontmatter(), Error);
  assertThrows(() => provider.getDefaultTemplate(), Error);
  assertThrows(() => provider.buildArgs({}), Error);
  assertThrows(() => provider.getDefaultPath(), Error);
});
```

**Interfaces Tested:**
- `IConfigProvider` - Configuration management interface
- `IFileFinder` - File discovery interface
- `IReportGenerator` - Report generation interface
- `IPipeOperation` - Pipe operation interface
- `IAIToolProvider` - AI tool provider interface
- `IAIToolRunner` - AI tool runner interface

**Validation:**
- All interface methods throw when not implemented
- Concrete implementations properly extend interfaces
- Method signatures are correct

---

### 5. Container Tests (`test-container.js`)

**Class/Module Tested:** `src/container.js`

**Testing Methodology:**
- **Unit Testing** - Tests DI container functionality
- **Lifecycle Testing** - Tests singleton vs transient behavior
- **Dependency Resolution** - Tests service resolution

**Key Test Patterns:**

```javascript
// Pattern 1: Registration and retrieval
test('register and get service', () => {
  const container = new Container();
  container.register('service', () => ({ value: 42 }));
  const service = container.get('service');
  assert(service.value === 42, 'Should retrieve service');
});

// Pattern 2: Singleton behavior
test('singleton returns same instance', () => {
  const container = new Container();
  container.register('service', () => ({}), { singleton: true });
  const instance1 = container.get('service');
  const instance2 = container.get('service');
  assert(instance1 === instance2, 'Should return same instance');
});

// Pattern 3: Transient behavior
test('transient returns new instance', () => {
  const container = new Container();
  container.register('service', () => ({}));
  const instance1 = container.get('service');
  const instance2 = container.get('service');
  assert(instance1 !== instance2, 'Should return new instance');
});

// Pattern 4: Dependency injection
test('service with dependencies', () => {
  const container = new Container();
  container.register('logger', () => ({ log: () => 'logged' }));
  container.register('service', (c) => {
    return { logger: c.get('logger') };
  });
  const service = container.get('service');
  assert(service.logger.log() === 'logged', 'Should inject dependency');
});
```

**Features Tested:**
- Service registration
- Service retrieval
- Singleton lifecycle
- Transient lifecycle
- Dependency injection
- Error handling (missing services)
- Has() method
- Clear() method

---

### 6. Event Emitter Tests (`test-event-emitter.js`)

**Class/Module Tested:** `src/events/event-emitter.js`

**Testing Methodology:**
- **Unit Testing** - Tests event system functionality
- **Listener Management** - Tests registration/removal
- **Event Flow** - Tests event propagation
- **Error Handling** - Tests listener error isolation

**Key Test Patterns:**

```javascript
// Pattern 1: Basic event emission
test('on() and emit() work', () => {
  const emitter = new EventEmitter();
  let called = false;
  emitter.on('test', () => { called = true; });
  emitter.emit('test');
  assert(called === true, 'Should call listener');
});

// Pattern 2: Event data passing
test('emit passes data to listeners', () => {
  const emitter = new EventEmitter();
  let receivedData;
  emitter.on('test', (data) => { receivedData = data; });
  emitter.emit('test', { value: 42 });
  assert(receivedData.value === 42, 'Should pass data');
});

// Pattern 3: Multiple listeners
test('multiple listeners called in order', () => {
  const emitter = new EventEmitter();
  const calls = [];
  emitter.on('test', () => calls.push(1));
  emitter.on('test', () => calls.push(2));
  emitter.emit('test');
  assert(calls[0] === 1 && calls[1] === 2, 'Should call in order');
});

// Pattern 4: once() behavior
test('once() listener called only once', () => {
  const emitter = new EventEmitter();
  let count = 0;
  emitter.once('test', () => count++);
  emitter.emit('test');
  emitter.emit('test');
  assert(count === 1, 'Should call only once');
});

// Pattern 5: Error isolation
test('failing listener does not break others', () => {
  const emitter = new EventEmitter();
  let called = false;
  emitter.on('test', () => { throw new Error('fail'); });
  emitter.on('test', () => { called = true; });
  emitter.emit('test');
  assert(called === true, 'Second listener should still run');
});
```

**Features Tested:**
- Event registration with on()
- One-time listeners with once()
- Event emission with data
- Multiple listeners per event
- Listener removal with off()
- Remove all listeners
- Error isolation
- Listener order preservation

---

### 7. Security Tests (`test-security.js`)

**Classes/Modules Tested:** `src/security/input-validator.js`, `src/utils/rate-limiter.js`

**Testing Methodology:**
- **Security Testing** - Tests protection mechanisms
- **Attack Simulation** - Tests against known attack patterns
- **Edge Case Testing** - Tests boundary conditions
- **Performance Testing** - Tests rate limiting behavior

**Key Test Patterns:**

```javascript
// Pattern 1: Prototype pollution protection
test('validateObjectPath blocks __proto__', () => {
  assertThrows(
    () => InputValidator.validateObjectPath('__proto__.isAdmin'),
    SecurityError,
    'Should block __proto__'
  );
});

// Pattern 2: Directory traversal protection
test('validateFilePath blocks ../', () => {
  assertThrows(
    () => InputValidator.validateFilePath('../etc/passwd'),
    SecurityError,
    'Should block directory traversal'
  );
});

// Pattern 3: XSS protection
test('sanitizeInput removes script tags', () => {
  const input = '<script>alert("xss")</script>';
  const output = InputValidator.sanitizeInput(input);
  assert(!output.includes('<script>'), 'Should remove script tags');
});

// Pattern 4: Rate limiting
test('rate limiter enforces limit', async () => {
  const limiter = new RateLimiter(2); // 2 per second
  assert(limiter.tryAcquire() === true, 'First should succeed');
  assert(limiter.tryAcquire() === true, 'Second should succeed');
  assert(limiter.tryAcquire() === false, 'Third should fail');
});
```

**Security Scenarios Tested:**
- Prototype pollution attacks
- Directory traversal attempts
- System directory access
- XSS injection attempts
- Script tag injection
- Event handler injection
- Command injection
- Rate limit enforcement
- Token bucket refill
- Burst capacity handling

---

### 8. Runner Tests (`test-runners.js`)

**Classes/Modules Tested:** Provider/Runner architecture in `src/runners/`, `src/providers/`

**Testing Methodology:**
- **Interface Testing** - Tests runner/provider contracts
- **Integration Testing** - Tests ToolExecutor integration
- **Dry-Run Testing** - Tests non-executing runners
- **Memory Testing** - Tests in-memory execution capture

**Key Test Patterns:**

```javascript
// Pattern 1: Interface enforcement
test('IAIToolRunner.execute() throws if not implemented', () => {
  const runner = new IAIToolRunner();
  assertThrowsAsync(
    () => runner.execute('path', [], ''),
    Error,
    'Should throw if not implemented'
  );
});

// Pattern 2: Memory runner capture
test('MemoryRunner captures execution', async () => {
  const runner = new MemoryRunner();
  await runner.execute('goose', ['--model', 'gpt-4'], 'prompt');
  const executions = runner.getExecutions();
  assert(executions.length === 1, 'Should capture execution');
  assert(executions[0].args[0] === '--model', 'Should capture args');
});

// Pattern 3: Dry-run console output
test('ConsoleLoggerRunner outputs command', async () => {
  const runner = new ConsoleLoggerRunner();
  const result = await runner.execute('goose', ['--model', 'gpt-4'], 'test');
  assert(result.success === true, 'Should succeed');
  assert(result.stdout.includes('goose'), 'Should mention command');
});

// Pattern 4: File writer output
test('FileWriterRunner creates file', async () => {
  const runner = new FileWriterRunner({ outputPath: './test-out.txt' });
  await runner.execute('goose', ['--recipe', 'test'], 'prompt');
  assert(fs.existsSync('./test-out.txt'), 'Should create file');
});

// Pattern 5: Provider integration
test('ToolExecutor with provider', async () => {
  const provider = new GooseProvider();
  const executor = ToolExecutor.create(provider, 'memory');
  await executor.execute('test prompt', { model: 'gpt-4' });
  const executions = executor.getRunner().getExecutions();
  assert(executions[0].stdin === 'test prompt', 'Should pass prompt');
});
```

**Components Tested:**
- IAIToolRunner interface enforcement
- IAIToolProvider interface enforcement
- MemoryRunner execution capture
- ConsoleLoggerRunner output
- FileWriterRunner file creation
- GooseProvider argument building
- ToolExecutor integration
- Factory method pattern

---

## Testing Conventions

### Naming Conventions

**Test Files:**
- Format: `test-<module-name>.js`
- Example: `test-cli.js`, `test-pipes.js`

**Test Names:**
- Descriptive and specific
- Include expected behavior
- Example: `"trim operation removes whitespace"`

### Assertion Patterns

```javascript
// Basic assertion
assert(condition, 'Description of what should be true');

// Throws assertion
assertThrows(fn, ErrorType, 'Should throw specific error');

// Async throws assertion
await assertThrowsAsync(asyncFn, ErrorType, 'Should throw async error');

// Equality assertion
assert(actual === expected, 'Should equal expected value');

// Truthiness assertion
assert(value, 'Value should be truthy');
```

### Test Organization

```javascript
// 1. Setup
console.log('\n🧪 Running <Category> Tests\n');

// 2. Test execution
test('test name', () => {
  // Arrange
  const input = setupTestData();

  // Act
  const result = functionUnderTest(input);

  // Assert
  assert(result === expected, 'Should produce expected result');
});

// 3. Summary
console.log('\n' + '='.repeat(50));
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('='.repeat(50) + '\n');
```

### Cleanup Patterns

```javascript
// Before tests
function setup() {
  // Create test environment
}

// After tests
function cleanup() {
  // Remove test files/dirs
  if (fs.existsSync(testDir)) {
    fs.removeSync(testDir);
  }
}

// Try-finally pattern
try {
  setup();
  runTests();
} finally {
  cleanup();
}
```

---

## Running Tests

### Run All Tests

```bash
npm test
```

This runs all test suites in order:
1. CLI integration tests
2. Pipe operations tests
3. Schema validator tests
4. Interface tests
5. Container tests
6. Event emitter tests
7. Security tests
8. Runner tests

### Run Individual Test Suite

```bash
node test-cli.js          # CLI tests only
node test-pipes.js        # Pipe operations only
node test-security.js     # Security tests only
```

### Test Output Format

```
🧪 Running Security Tests

✓ validateObjectPath accepts valid path
✓ validateObjectPath blocks __proto__
✓ validateObjectPath blocks constructor
✗ Custom test failed
  Error: Expected true but got false

==================================================
Passed: 43
Failed: 1
==================================================
```

### Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed (via npm test)

---

## Writing New Tests

### Step 1: Choose Test File

Add tests to existing file if testing existing functionality, or create new file:

```bash
# Create new test file
touch test-new-feature.js
chmod +x test-new-feature.js
```

### Step 2: Add Test Structure

```javascript
#!/usr/bin/env node

const ModuleUnderTest = require('./src/new-module');

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

// Tests go here
console.log('\n🧪 Running New Feature Tests\n');

assert(true, 'Example test');

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('='.repeat(50) + '\n');

process.exit(failed > 0 ? 1 : 0);
```

### Step 3: Write Tests

```javascript
// Test a single function
assert(
  add(2, 3) === 5,
  'add() should sum two numbers'
);

// Test error handling
assertThrows(
  () => divide(1, 0),
  Error,
  'divide() should throw on zero'
);

// Test async function
async function testAsync() {
  const result = await fetchData();
  assert(result !== null, 'fetchData() should return data');
}
```

### Step 4: Add to Test Script

Update `package.json`:

```json
{
  "scripts": {
    "test": "node test-cli.js && node test-pipes.js && node test-new-feature.js && ..."
  }
}
```

### Best Practices

1. **Test one thing** - Each test should validate one behavior
2. **Use descriptive names** - Test name should explain what's being tested
3. **Arrange-Act-Assert** - Follow AAA pattern
4. **Test edge cases** - Include boundary conditions
5. **Test error paths** - Verify error handling
6. **Keep tests independent** - Tests shouldn't depend on each other
7. **Clean up after tests** - Remove test files/state
8. **Use meaningful assertions** - Clear assertion messages

---

## Test Coverage

### Current Coverage (as of 2024-12-03)

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| CLI Integration | 22 | Commands, config, file creation |
| Pipe Operations | 33 | All built-in operations, chains |
| Schema Validator | 15 | Validation, types, field variants |
| Interfaces | 32 | All interface contracts |
| Container | 24 | DI, lifecycle, dependencies |
| Event Emitter | 36 | Events, listeners, error isolation |
| Security | 45 | Input validation, rate limiting |
| Runners | 60 | Provider/runner architecture |
| **Total** | **267** | **Comprehensive** |

### Coverage Goals

- ✅ **Core functionality**: 100% covered
- ✅ **Public APIs**: 100% covered
- ✅ **Security mechanisms**: 100% covered
- ✅ **Error handling**: Well covered
- ⚠️ **Edge cases**: Good coverage, can always improve
- ⚠️ **Integration scenarios**: Basic coverage

### Areas for Future Testing

1. **Complex Integration Scenarios**
   - Multi-file processing workflows
   - Hierarchical configuration loading
   - Pipe inheritance across levels

2. **Performance Testing**
   - Large file processing
   - Many custom pipes
   - Rate limiter under load

3. **Error Recovery**
   - Partial failure scenarios
   - Corrupt config files
   - Invalid .geese files

---

## Troubleshooting Tests

### Common Issues

**Issue: Tests fail with MODULE_NOT_FOUND**
```bash
# Solution: Install dependencies
npm install
```

**Issue: Tests fail due to file system state**
```bash
# Solution: Clean up test artifacts
rm -rf /tmp/geese-*
rm -rf ~/.geese
```

**Issue: Tests timeout**
```bash
# Solution: Check for infinite loops or blocking operations
# Add timeout to async tests
```

**Issue: Flaky tests**
```bash
# Solution: Ensure tests are independent
# Check for race conditions in async tests
# Avoid relying on timing
```

### Debugging Tests

```javascript
// Add debug output
console.log('DEBUG:', variable);

// Use try-catch for better error messages
try {
  functionUnderTest();
} catch (error) {
  console.log('Error details:', error);
  throw error;
}

// Run single test
// Comment out other tests temporarily
```

---

## Conclusion

The Geese project has comprehensive test coverage using a simple, effective testing approach. The custom test framework provides:

- ✅ Fast execution
- ✅ Clear output
- ✅ Easy debugging
- ✅ No external dependencies
- ✅ CI/CD friendly

When adding new features:
1. Write tests first (TDD) or alongside implementation
2. Follow existing patterns
3. Cover happy path and error cases
4. Update this guide if introducing new testing patterns

**Remember:** Good tests are the foundation of maintainable code. They give you confidence to refactor and evolve the codebase.

---

**Document Owner:** Development Team
**Last Updated:** 2024-12-03
**Next Review:** 2025-03-01