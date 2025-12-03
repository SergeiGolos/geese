# Testing Architecture - Provider/Runner Pattern

## Overview

The Geese project implements a **Provider/Runner Architecture** that separates command structure (provider) from command execution (runner). This architecture enables comprehensive testing without spawning real processes, supports multiple dry-run modes, and provides a clean abstraction for AI tool integration.

## Architecture Components

### 1. IAIToolProvider Interface

**Purpose:** Defines how commands are structured for AI tools.

**Responsibilities:**
- Define frontmatter schema (required/optional fields)
- Build command-line arguments from configuration
- Provide default templates and configurations
- Specify tool executable path

**Methods:**
```javascript
getFrontmatterSchema()   // Returns { required: [], optional: [] }
getDefaultFrontmatter()  // Returns default config object
getDefaultTemplate()     // Returns template string
buildArgs(config)        // Returns array of CLI arguments
getDefaultPath()         // Returns executable path
```

**Implementation:** `src/providers/GooseProvider.js`

### 2. IAIToolRunner Interface

**Purpose:** Handles execution of AI tool commands.

**Responsibilities:**
- Execute commands with arguments and stdin
- Capture stdout and stderr
- Handle execution lifecycle
- Check tool availability

**Methods:**
```javascript
async execute(executablePath, args, stdin, options)
  // Returns: { success, stdout, stderr, exitCode, duration }

async checkAvailable(executablePath)
  // Returns: boolean
```

**Implementations:**
- `src/runners/RealToolRunner.js` - Actual process execution
- `src/runners/ConsoleLoggerRunner.js` - Console logging (dry-run)
- `src/runners/FileWriterRunner.js` - File output (dry-run)
- `src/runners/MemoryRunner.js` - In-memory testing

## Runner Implementations

### RealToolRunner

**Use Case:** Production execution of AI tools

**Features:**
- Spawns actual child processes
- Real-time stdout/stderr streaming
- Configurable callbacks for output handling
- Full process lifecycle management

**Example:**
```javascript
const runner = new RealToolRunner();
const result = await runner.execute('goose', ['--model', 'gpt-4'], 'prompt text', {
  realTime: true,
  onStdout: (data) => console.log(data),
  onStderr: (data) => console.error(data)
});
```

### ConsoleLoggerRunner

**Use Case:** Dry-run mode for debugging and verification

**Features:**
- Logs command details to console
- Shows executable, arguments, and stdin
- Colorized output for readability
- No actual execution

**Output Format:**
```
📋 Dry-Run Mode (Console Output)
────────────────────────────────────────────────────────────

🔧 Command:
  goose --model gpt-4 --recipe code-review

📥 Arguments:
  [0] --model
  [1] gpt-4
  [2] --recipe
  [3] code-review

📝 Standard Input (stdin):
    1 | Please analyze this code...
    2 | File: example.js
    ...

  Total: 10 lines, 250 characters

────────────────────────────────────────────────────────────
✓ Dry-run complete (no actual execution)
```

**Example:**
```javascript
const runner = new ConsoleLoggerRunner();
const result = await runner.execute('goose', ['--model', 'gpt-4'], 'prompt');
// Logs to console, returns success
```

### FileWriterRunner

**Use Case:** Dry-run mode with file output for inspection

**Features:**
- Writes command details to file
- Uses frontmatter format (YAML + body)
- Command arguments in frontmatter
- Stdin content in body
- Timestamped execution records

**Output Format:**
```yaml
---
executable: goose
args:
  - --model
  - gpt-4
  - --recipe
  - code-review
timestamp: 2024-12-03T05:45:00.000Z
mode: dry-run
---

Please analyze this code...
File: example.js
...
```

**Example:**
```javascript
const runner = new FileWriterRunner('./dry-run-output.txt');
const result = await runner.execute('goose', ['--model', 'gpt-4'], 'prompt');
// Writes to file, returns success
```

### MemoryRunner

**Use Case:** Unit testing without spawning processes

**Features:**
- Stores execution details in memory
- Returns configurable mock responses
- Tracks all executions for verification
- No actual process execution
- Perfect for automated testing

**Example:**
```javascript
const runner = new MemoryRunner({
  mockResponse: {
    success: true,
    stdout: 'Mock AI response',
    stderr: '',
    exitCode: 0
  }
});

const result = await runner.execute('goose', ['--model', 'gpt-4'], 'test prompt');

// Verify execution
const executions = runner.getExecutions();
assert(executions.length === 1);
assert(executions[0].args.includes('--model'));
assert(executions[0].stdin === 'test prompt');
```

## ToolExecutor

**Purpose:** Unified interface combining provider and runner.

**Features:**
- Delegates to provider for command structure
- Delegates to runner for execution
- Provides backward compatibility with CLIRunner
- Factory method for easy runner selection

**Example:**
```javascript
const provider = new GooseProvider();

// Create with specific runner type
const executor = ToolExecutor.create(provider, 'memory', {
  mockResponse: { success: true, stdout: 'test' }
});

// Use like CLIRunner
const schema = executor.getFrontmatterSchema();
const result = await executor.execute('prompt', { model: 'gpt-4' });
```

**Factory Method:**
```javascript
ToolExecutor.create(provider, runnerType, options)

// Runner types:
// - 'real'    : RealToolRunner (default)
// - 'console' : ConsoleLoggerRunner
// - 'file'    : FileWriterRunner (requires options.outputPath)
// - 'memory'  : MemoryRunner (accepts options.mockResponse)
```

## Integration with CLI

### Command Line Options

```bash
# Normal execution (RealToolRunner)
geese run

# Dry-run with console output (ConsoleLoggerRunner)
geese run --dry-run

# Dry-run with file output (FileWriterRunner)
geese run --dry-run-file ./commands.txt
```

### Implementation in run-command.js

```javascript
// Configure runner type based on options
if (options.dryRunFile) {
  toolRunner.setRunnerType('file', { outputPath: options.dryRunFile });
} else if (options.dryRun) {
  toolRunner.setRunnerType('console');
}
// Otherwise uses default RealToolRunner
```

## Testing Strategy

### Unit Testing with MemoryRunner

```javascript
// test-example.js
const { MemoryRunner } = require('./src/runners/MemoryRunner');
const { ToolExecutor } = require('./src/ToolExecutor');
const { GooseProvider } = require('./src/providers/GooseProvider');

// Create test executor
const provider = new GooseProvider();
const memoryRunner = new MemoryRunner({
  mockResponse: { success: true, stdout: 'AI response' }
});
const executor = new ToolExecutor(provider, memoryRunner);

// Test command building
const args = executor.buildArgs({ model: 'gpt-4', recipe: 'code-review' });
assert(args.includes('--model'));
assert(args.includes('gpt-4'));

// Test execution
await executor.execute('test prompt', { model: 'gpt-4' });

// Verify execution details
const executions = memoryRunner.getExecutions();
assert(executions.length === 1);
assert(executions[0].stdin === 'test prompt');
assert(executions[0].args.includes('--model'));
```

### Integration Testing with FileWriterRunner

```javascript
// Create file writer for inspection
const tmpFile = '/tmp/test-commands.txt';
const executor = ToolExecutor.create(provider, 'file', {
  outputPath: tmpFile
});

// Execute
await executor.execute('prompt', { model: 'gpt-4' });

// Read and verify file content
const content = fs.readFileSync(tmpFile, 'utf-8');
assert(content.includes('executable: goose'));
assert(content.includes('--model'));
assert(content.includes('gpt-4'));
```

## Benefits

### 1. Testability
- Unit tests run without spawning processes
- MemoryRunner provides instant feedback
- Easy to mock and verify behavior
- No external dependencies required

### 2. Debugging
- ConsoleLoggerRunner shows exact commands
- FileWriterRunner preserves command history
- Easy to reproduce issues
- Clear visibility into command structure

### 3. Extensibility
- New providers for different AI tools
- New runners for different execution modes
- Clean separation of concerns
- Easy to add features without breaking existing code

### 4. Backward Compatibility
- ToolExecutor provides CLIRunner-like interface
- GooseRunner updated to use new architecture
- Existing code continues to work
- Gradual migration path

## Migration Guide

### For Existing Tool Runners

```javascript
// Old approach (tightly coupled)
class MyToolRunner extends CLIRunner {
  async execute(prompt, config) {
    // Tightly coupled to spawn logic
  }
}

// New approach (separated)
// 1. Create provider
class MyToolProvider extends IAIToolProvider {
  buildArgs(config) { ... }
  // ... other provider methods
}

// 2. Use existing runners or create custom
const provider = new MyToolProvider();
const executor = ToolExecutor.create(provider, 'real');

// 3. For testing
const testExecutor = ToolExecutor.create(provider, 'memory', {
  mockResponse: { success: true, stdout: 'test' }
});
```

### For Test Suites

```javascript
// Before: Hard to test without spawning processes
test('should execute goose', async () => {
  const runner = new GooseRunner();
  // This spawns a real process - slow and fragile
  const result = await runner.execute('prompt', {});
});

// After: Easy to test with MemoryRunner
test('should execute goose', async () => {
  const provider = new GooseProvider();
  const executor = ToolExecutor.create(provider, 'memory', {
    mockResponse: { success: true, stdout: 'expected output' }
  });
  const result = await executor.execute('prompt', { model: 'gpt-4' });
  
  // Verify without spawning
  assert(result.success === true);
  assert(result.stdout === 'expected output');
  
  // Verify command structure
  const executions = executor.getRunner().getExecutions();
  assert(executions[0].args.includes('--model'));
});
```

## Best Practices

### 1. Use MemoryRunner for Unit Tests
```javascript
// Fast, predictable, no side effects
const runner = new MemoryRunner({ mockResponse: { ... } });
```

### 2. Use FileWriterRunner for Integration Tests
```javascript
// Verify command structure without execution
const runner = new FileWriterRunner('./test-output.txt');
```

### 3. Use ConsoleLoggerRunner for Manual Testing
```bash
# See exactly what would be executed
geese run --dry-run
```

### 4. Use RealToolRunner for Production
```javascript
// Default behavior - actual execution
const executor = ToolExecutor.create(provider, 'real');
```

### 5. Configure Mock Responses Realistically
```javascript
const runner = new MemoryRunner({
  mockResponse: {
    success: true,
    stdout: 'Realistic AI response here...',
    stderr: '',
    exitCode: 0
  }
});
```

## Related Documentation

- [Architecture Guide](./ARCHITECTURE_GUIDE.md) - Overall system architecture
- [ADR-001: Interface-Based Architecture](./adr/ADR-001-interface-based-architecture.md)
- [ADR-002: Dependency Injection Container](./adr/ADR-002-dependency-injection-container.md)
- [Technical Debt Section 5](../TECHNICAL_DEBT.md#5-testing-challenges) - Implementation details

## Summary

The Provider/Runner Architecture provides:
- ✅ Clean separation of command structure and execution
- ✅ Multiple execution modes (real, console, file, memory)
- ✅ Comprehensive testing without spawning processes
- ✅ Dry-run modes for debugging and verification
- ✅ Backward compatibility with existing code
- ✅ Extensibility for new AI tools and execution modes
- ✅ 59 comprehensive tests validating the architecture

This architecture addresses the testing challenges outlined in TECHNICAL_DEBT.md Section 5 and provides a solid foundation for future development.
