# Technical Debt Analysis - Geese Project

**Generated:** 2024-12-03  
**Version:** 1.0.0  
**Status:** Active Review

## Executive Summary

This document identifies technical debt, deep coupling issues, and areas for refactoring in the Geese project. The application is functional and demonstrates solid architectural thinking with its hierarchical configuration system and extensible tool registry. However, several areas exhibit tight coupling, oversized classes, and responsibilities that could be better distributed.

### Key Findings

1. **Deep Coupling Issues**: 6 major coupling patterns identified across core modules (detailed in Section 1)
2. **Large Classes**: 4 classes exceed 300 lines with multiple responsibilities (bin/geese.js: 747 lines, pipe-operations.js: 577 lines, config-manager.js: 442 lines, wizard.js: 361 lines)
3. **God Object Patterns**: 3 singleton exports creating global state (tool-registry, pipe-operations, geese-file-finder)
4. **Interface Violations**: Limited use of interfaces despite abstract base classes
5. **Code Duplication**: Validation, configuration merging, and directory walking logic duplicated across 2-3 files each (detailed in Section 4)

---

## 1. Deep Coupling and Dependency Issues

### 1.1 Singleton Instances Creating Global State

**Location:** `src/tool-registry.js`, `src/pipe-operations.js`, `src/geese-file-finder.js`

**Problem:**
```javascript
// tool-registry.js
module.exports = new ToolRegistry();

// pipe-operations.js
module.exports = new PipeOperations();

// geese-file-finder.js
module.exports = new GeeseFileFinder();
```

**Issues:**
- Creates hidden global state that can't be mocked or tested in isolation
- Prevents dependency injection
- Makes unit testing difficult as instances are shared
- Violates Dependency Inversion Principle (depends on concrete implementations)

**Impact:** High - Affects testability and modularity across the entire codebase

**Proposed Solution:**
```javascript
// Export the class instead of an instance
class ToolRegistry {
  // ... implementation
}

module.exports = ToolRegistry;

// Usage (with dependency injection):
class Application {
  constructor(toolRegistry = new ToolRegistry()) {
    this.toolRegistry = toolRegistry;
  }
}
```

**Benefits:**
- Enables dependency injection
- Improves testability with mock instances
- Allows multiple instances for different contexts
- Follows SOLID principles

---

### 1.2 Direct Module Imports in Constructors/Methods

**Location:** `bin/geese.js` lines 460-468

**Problem:**
```javascript
async function runCommand(directory, options) {
  const parser = new GeeseParser();
  const pipeOps = require('../src/pipe-operations'); // Direct import
  
  // Initialize pipe operations
  await pipeOps.initializeHierarchy(workingDir);
  
  // Also load from old location
  const homeDir = require('os').homedir(); // Another direct dependency
  const pipesDir = path.join(homeDir, '.geese', 'pipes');
  parser.loadCustomPipes(pipesDir);
}
```

**Issues:**
- Hard-coded dependencies make testing difficult
- Tight coupling to file system and module resolution
- Parser shouldn't need to know about global pipe operation instance
- Mixing instantiation with business logic

**Impact:** Medium-High - Reduces flexibility and complicates testing

**Proposed Solution:**

Create a `CommandContext` or `ServiceContainer` class:

```javascript
class CommandContext {
  constructor(options = {}) {
    this.parser = options.parser || new GeeseParser();
    this.pipeOperations = options.pipeOperations || new PipeOperations();
    this.reportGenerator = options.reportGenerator || new ReportGenerator();
    this.toolRegistry = options.toolRegistry || new ToolRegistry();
    this.configManager = options.configManager || new ConfigManager();
  }
  
  async initialize(workingDir) {
    await this.pipeOperations.initializeHierarchy(workingDir);
    // Other initialization
  }
}

async function runCommand(directory, options) {
  const context = new CommandContext();
  await context.initialize(workingDir);
  // Use context.parser, context.pipeOperations, etc.
}
```

---

### 1.3 GeeseParser Directly Depends on PipeOperations Singleton

**Location:** `src/geese-parser.js` line 6

**Problem:**
```javascript
const pipeOperations = require('./pipe-operations'); // Singleton instance

class GeeseParser {
  // ... later in code
  context[key] = pipeOperations.executePipeChain(value, context);
}
```

**Issues:**
- Parser is tightly coupled to global PipeOperations instance
- Can't inject custom pipe operations for testing
- Can't use different pipe operations per parser instance
- Violates Open/Closed Principle

**Impact:** High - Core parsing logic can't be tested in isolation

**Proposed Solution:**

Inject PipeOperations through constructor:

```javascript
class GeeseParser {
  constructor(pipeOperations = null, handlebars = null) {
    this.pipeOperations = pipeOperations || new PipeOperations();
    this.handlebars = handlebars || Handlebars.create();
    this.registerHelpers();
  }
  
  prepareContext(geeseData, targetFile) {
    // Use this.pipeOperations instead of global
    context[key] = this.pipeOperations.executePipeChain(value, context);
  }
}
```

---

### 1.4 ConfigManager Method Duplication

**Location:** `src/config-manager.js` and `src/cli-argument-parser.js`

**Problem:**
Both classes implement similar nested value setting logic with prototype pollution guards:

```javascript
// config-manager.js lines 88-141
async set(key, value) {
  const keys = key.split('.');
  // Guard against prototype pollution
  for (const k of keys) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
      throw new Error(`Invalid configuration key...`);
    }
  }
  // ... nested traversal logic
}

// cli-argument-parser.js lines 56-86
static setNestedValue(obj, key, value) {
  const keys = key.split('.');
  // Guard against prototype pollution
  for (const k of keys) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
      throw new Error(`Invalid configuration key...`);
    }
  }
  // ... similar nested traversal logic
}
```

**Issues:**
- Duplicated security logic across multiple files
- If one is updated, the other might not be
- No shared validation utilities

**Impact:** Medium - Maintenance burden and potential security inconsistency

**Proposed Solution:**

Create a shared `ObjectPathHelper` utility:

```javascript
// src/utils/object-path-helper.js
class ObjectPathHelper {
  static DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
  
  static validatePath(path) {
    const keys = path.split('.');
    for (const key of keys) {
      if (this.DANGEROUS_KEYS.includes(key)) {
        throw new Error(`Invalid key: ${path}. Contains dangerous property.`);
      }
    }
    return keys;
  }
  
  static setNestedValue(obj, path, value) {
    const keys = this.validatePath(path);
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!Object.prototype.hasOwnProperty.call(current, key)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return obj;
  }
  
  static getNestedValue(obj, path) {
    const keys = this.validatePath(path);
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
}

module.exports = ObjectPathHelper;
```

---

## 2. Single Responsibility Principle Violations

### 2.1 bin/geese.js - Monolithic Command File (747 lines)

**Location:** `bin/geese.js`

**Problem:**
The main CLI file contains:
- Command-line argument parsing (Commander setup)
- Configuration management logic
- File discovery and selection
- User interaction (inquirer prompts)
- Editor launching
- Tool execution orchestration
- Report generation
- Error handling
- Multiple command implementations (run, new, config, pipe)

**Issues:**
- 747 lines in a single file
- Multiple commands mixed in one file
- Each function has 50-200+ lines
- Hard to test individual commands
- High cyclomatic complexity (107 conditional statements including if/else/for/while/switch/ternary/logical operators counted by: `grep -E "(if |else |for |while |switch |case |catch |\?\s|\|\||\&\&)" bin/geese.js | wc -l`)

**Impact:** High - Maintenance nightmare, poor testability

**Proposed Solution:**

Break into command handlers:

```
bin/
├── geese.js (50 lines - CLI setup only)
├── commands/
│   ├── run-command.js
│   ├── new-command.js
│   ├── config-command.js
│   └── pipe-command.js
└── utils/
    ├── editor-launcher.js
    ├── file-selector.js
    └── target-selector.js
```

**Example Refactored Structure:**

```javascript
// bin/geese.js (simplified)
const { Command } = require('commander');
const RunCommand = require('./commands/run-command');
const NewCommand = require('./commands/new-command');
const ConfigCommand = require('./commands/config-command');
const PipeCommand = require('./commands/pipe-command');

const program = new Command();

program
  .name('geese')
  .description('AI-powered file processing tool')
  .version('1.0.0');

program
  .command('run [directory]')
  .description('Process .geese files')
  .option('-f, --file <file>', 'Process a specific .geese file')
  .option('-o, --output <dir>', 'Output directory for logs')
  .option('--dry-run', 'Preview without executing')
  .action(RunCommand.execute);

program
  .command('new <name>')
  .description('Create a new .geese file')
  .option('-t, --tool <tool>', 'CLI tool to use')
  .option('--wizard', 'Interactive wizard')
  .action(NewCommand.execute);

program
  .command('config')
  .description('Manage configuration')
  .option('--get <key>', 'Get configuration value')
  .option('--set <key> <value>', 'Set configuration value')
  .action(ConfigCommand.execute);

program
  .command('pipe <action> [name]')
  .description('Manage custom pipes')
  .action(PipeCommand.execute);

program.parse();
```

```javascript
// bin/commands/run-command.js
const CommandContext = require('../context/command-context');
const FileSelector = require('../utils/file-selector');
const TargetProcessor = require('../processors/target-processor');

class RunCommand {
  static async execute(directory, options) {
    const context = await CommandContext.create(directory, options);
    
    const geeseFiles = await FileSelector.selectGeeseFiles(context);
    if (!geeseFiles.length) return;
    
    const processor = new TargetProcessor(context);
    const sessions = await processor.processFiles(geeseFiles);
    
    await context.reportGenerator.saveReport(sessions);
  }
}

module.exports = RunCommand;
```

---

### 2.2 PipeOperations - God Class (577 lines, 45 methods)

**Location:** `src/pipe-operations.js`

**Problem:**
Single class responsible for:
- Operation registration and lookup
- Built-in operation implementation (35+ operations)
- Custom pipe loading from filesystem
- Hierarchical pipe discovery
- Argument parsing
- Pipe chain execution
- Source tracking

**Issues:**
- 577 lines in one file
- 45+ methods in single class
- Mixes infrastructure (loading, parsing) with business logic (operations)
- New operations bloat the class further
- Testing requires testing entire operation registry

**Impact:** High - Hard to extend, test, and maintain

**Proposed Solution:**

Split into focused modules:

```
src/pipe-operations/
├── index.js (exports PipeRegistry)
├── pipe-registry.js (registration, lookup, execution)
├── pipe-chain-executor.js (chain execution logic)
├── pipe-argument-parser.js (argument parsing)
├── pipe-loader.js (custom pipe loading)
├── operations/
│   ├── string-operations.js (trim, toUpperCase, etc.)
│   ├── file-operations.js (readFile, loadFile)
│   ├── list-operations.js (filter, map, first, last)
│   ├── type-operations.js (parseJson, stringify, etc.)
│   ├── regex-operations.js (match, test)
│   └── utility-operations.js (default, echo)
└── built-in-operations.js (registers all built-in ops)
```

**Example:**

```javascript
// src/pipe-operations/pipe-registry.js
class PipeRegistry {
  constructor() {
    this.operations = new Map();
    this.sources = new Map();
  }
  
  register(name, fn, source = 'custom') {
    this.operations.set(name, fn);
    this.sources.set(name, source);
  }
  
  get(name) {
    return this.operations.get(name);
  }
  
  has(name) {
    return this.operations.has(name);
  }
  
  list() {
    return Array.from(this.operations.keys());
  }
}

// src/pipe-operations/operations/string-operations.js
class StringOperations {
  static register(registry) {
    registry.register('trim', (value) => String(value).trim(), 'builtin');
    registry.register('toUpperCase', (value) => String(value).toUpperCase(), 'builtin');
    registry.register('toLowerCase', (value) => String(value).toLowerCase(), 'builtin');
    registry.register('substring', (value, args) => {
      const str = String(value);
      const start = parseInt(args[0], 10) || 0;
      const end = args[1] !== undefined ? parseInt(args[1], 10) : undefined;
      return str.substring(start, end);
    }, 'builtin');
    // ... more string operations
  }
}

// src/pipe-operations/built-in-operations.js
const StringOperations = require('./operations/string-operations');
const FileOperations = require('./operations/file-operations');
const ListOperations = require('./operations/list-operations');
// ... other operation modules

function registerBuiltInOperations(registry) {
  StringOperations.register(registry);
  FileOperations.register(registry);
  ListOperations.register(registry);
  // ... register others
}

module.exports = registerBuiltInOperations;
```

---

### 2.3 ConfigManager - Too Many Responsibilities (442 lines, 37 methods)

**Location:** `src/config-manager.js`

**Problem:**
Handles:
- File I/O (loading, saving config files)
- Nested value get/set/delete operations
- Deep merge logic
- Hierarchical config loading (4 levels)
- Tool-specific configuration
- Local config directory discovery
- Path resolution
- Prototype pollution guards
- Config source tracking

**Issues:**
- 442 lines in single class
- Mixing I/O, business logic, and utilities
- Deep merge could be extracted
- Path utilities could be separate
- Hard to test nested operations independently

**Impact:** Medium-High - Complex testing, hard to extend

**Proposed Solution:**

Extract responsibilities:

```
src/config/
├── config-manager.js (orchestrates, ~100 lines)
├── config-file-io.js (read/write operations)
├── config-hierarchy.js (hierarchical loading)
├── config-merger.js (deep merge logic)
└── utils/
    ├── config-path-resolver.js (find .geese directories)
    └── nested-object-accessor.js (get/set/delete with validation)
```

**Example:**

```javascript
// src/config/config-manager.js
const ConfigFileIO = require('./config-file-io');
const ConfigHierarchy = require('./config-hierarchy');
const NestedObjectAccessor = require('./utils/nested-object-accessor');

class ConfigManager {
  constructor(configIO = null, hierarchy = null, accessor = null) {
    this.configIO = configIO || new ConfigFileIO();
    this.hierarchy = hierarchy || new ConfigHierarchy();
    this.accessor = accessor || new NestedObjectAccessor();
  }
  
  async loadConfig() {
    return this.configIO.load();
  }
  
  async saveConfig(config) {
    return this.configIO.save(config);
  }
  
  async get(key) {
    const config = await this.loadConfig();
    return this.accessor.get(config, key);
  }
  
  async set(key, value) {
    const config = await this.loadConfig();
    this.accessor.set(config, key, value);
    await this.saveConfig(config);
  }
  
  async loadHierarchicalConfig(workingDir, geeseConfig = {}, cliArgs = {}) {
    return this.hierarchy.load(workingDir, geeseConfig, cliArgs);
  }
}

// src/config/utils/nested-object-accessor.js
class NestedObjectAccessor {
  get(obj, key) {
    const keys = this.validateAndSplit(key);
    let current = obj;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  set(obj, key, value) {
    const keys = this.validateAndSplit(key);
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!Object.prototype.hasOwnProperty.call(current, keys[i])) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }
  
  validateAndSplit(key) {
    const keys = key.split('.');
    const dangerous = ['__proto__', 'constructor', 'prototype'];
    
    for (const k of keys) {
      if (dangerous.includes(k)) {
        throw new Error(`Invalid key: ${key}. Contains dangerous property.`);
      }
    }
    
    return keys;
  }
}
```

---

### 2.4 Wizard Class - Mixed Concerns (361 lines)

**Location:** `src/wizard.js`

**Problem:**
Combines:
- Property metadata management
- User prompts (inquirer integration)
- Input validation
- Type coercion
- UI formatting

**Issues:**
- Tight coupling to inquirer
- Hard to test without UI interaction
- Property metadata could be configuration
- Validation logic embedded in prompt logic

**Impact:** Medium - Testing requires UI mocking

**Proposed Solution:**

```javascript
// src/wizard/property-metadata.js
class PropertyMetadata {
  static getMetadata(property, toolRunner) {
    // Check tool runner first
    if (toolRunner.getPropertyMetadata) {
      const meta = toolRunner.getPropertyMetadata(property);
      if (meta) return meta;
    }
    
    // Fallback to defaults
    return this.DEFAULT_METADATA[property] || { type: 'input' };
  }
  
  static DEFAULT_METADATA = {
    include: { type: 'array', hint: '...', examples: [...] },
    exclude: { type: 'array', hint: '...', examples: [...] },
    // ...
  };
}

// src/wizard/prompt-builder.js
class PromptBuilder {
  static buildPrompt(property, metadata, currentValue) {
    const displayName = property.replace(/^[$@]/, '');
    
    switch (metadata.type) {
      case 'select':
        return this.buildSelectPrompt(displayName, metadata, currentValue);
      case 'array':
        return this.buildArrayPrompt(displayName, metadata, currentValue);
      case 'number':
        return this.buildNumberPrompt(displayName, metadata, currentValue);
      default:
        return this.buildInputPrompt(displayName, metadata, currentValue);
    }
  }
}

// src/wizard/wizard.js (simplified)
class Wizard {
  constructor(toolRunner, promptBuilder = null, metadataProvider = null) {
    this.toolRunner = toolRunner;
    this.promptBuilder = promptBuilder || new PromptBuilder();
    this.metadataProvider = metadataProvider || PropertyMetadata;
  }
  
  async promptForProperty(property, currentValue) {
    const metadata = this.metadataProvider.getMetadata(property, this.toolRunner);
    const prompt = this.promptBuilder.buildPrompt(property, metadata, currentValue);
    const result = await inquirer.prompt([prompt]);
    return result[prompt.name];
  }
}
```

---

## 3. Interface and Abstraction Issues

### 3.1 Missing Interfaces for Key Abstractions

**Problem:**
While `CLIRunner` is an abstract base class, there are no defined interfaces for:
- Configuration providers
- File finders
- Report generators
- Pipe operations

**Issues:**
- Hard to swap implementations
- No contract enforcement
- Can't easily mock for testing
- Violates Dependency Inversion Principle

**Impact:** Medium - Limits extensibility and testing

**Proposed Solution:**

Define interfaces (or base classes with documented contracts):

```javascript
// src/interfaces/config-provider.js
/**
 * Interface for configuration providers
 * Implementations must provide these methods
 */
class IConfigProvider {
  async loadConfig() {
    throw new Error('loadConfig() must be implemented');
  }
  
  async saveConfig(config) {
    throw new Error('saveConfig() must be implemented');
  }
  
  async get(key) {
    throw new Error('get() must be implemented');
  }
  
  async set(key, value) {
    throw new Error('set() must be implemented');
  }
}

// src/interfaces/file-finder.js
class IFileFinder {
  async discoverGeeseFiles(workingDir) {
    throw new Error('discoverGeeseFiles() must be implemented');
  }
  
  async findGeeseInDirectory(dir, recursive = true) {
    throw new Error('findGeeseInDirectory() must be implemented');
  }
}

// src/interfaces/report-generator.js
class IReportGenerator {
  createSessionEntry(geeseFile, targetFile, context, prompt, response, startTime, endTime) {
    throw new Error('createSessionEntry() must be implemented');
  }
  
  async saveReport(sessions) {
    throw new Error('saveReport() must be implemented');
  }
}
```

Then implementations extend these:

```javascript
class ConfigManager extends IConfigProvider {
  // Must implement all interface methods
}

class GeeseFileFinder extends IFileFinder {
  // Must implement all interface methods
}
```

---

### 3.2 No Strategy Pattern for Operations

**Location:** `src/pipe-operations.js`

**Problem:**
Pipe operations are just functions registered in a Map. No formal interface or base class.

**Issues:**
- No type checking or validation
- Can't enforce operation signature
- Hard to document expected behavior
- Can't use polymorphism benefits

**Impact:** Low-Medium - Mostly functional but less safe

**Proposed Solution:**

```javascript
// src/pipe-operations/operation-interface.js
class IPipeOperation {
  /**
   * Execute the operation
   * @param {*} value - Input value
   * @param {string[]} args - Operation arguments
   * @param {Object} context - Execution context
   * @returns {*} Transformed value
   */
  execute(value, args, context) {
    throw new Error('execute() must be implemented');
  }
  
  /**
   * Get operation name
   * @returns {string}
   */
  getName() {
    throw new Error('getName() must be implemented');
  }
  
  /**
   * Validate arguments (optional)
   * @param {string[]} args
   * @returns {boolean}
   */
  validateArgs(args) {
    return true;
  }
}

// Example implementation
class TrimOperation extends IPipeOperation {
  getName() {
    return 'trim';
  }
  
  execute(value, args, context) {
    return String(value).trim();
  }
}

// Registry can now enforce type
class PipeRegistry {
  register(operation) {
    if (!(operation instanceof IPipeOperation)) {
      throw new Error('Operation must extend IPipeOperation');
    }
    this.operations.set(operation.getName(), operation);
  }
}
```

---

## 4. Code Duplication

### 4.1 File Size Formatting Duplication

**Location:** Multiple files

**Problem:**
File size formatting logic appears in multiple places with slight variations.

**Proposed Solution:**

```javascript
// src/utils/file-size-formatter.js
class FileSizeFormatter {
  static format(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  static getFileSize(filePath) {
    const stats = fs.statSync(filePath);
    return this.format(stats.size);
  }
}
```

---

### 4.2 Directory Walking Logic Duplication

**Location:** `src/config-manager.js` and `src/pipe-operations.js`

**Problem:**
Both classes walk up directory tree to find `.geese` directory:

```javascript
// config-manager.js
getLocalConfigDir(startPath) {
  let currentDir = path.resolve(startPath);
  const root = path.parse(currentDir).root;
  
  while (currentDir !== root) {
    const geeseDir = path.join(currentDir, '.geese');
    if (fs.existsSync(geeseDir)) {
      return geeseDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

// pipe-operations.js
findLocalGeeseDir(startPath) {
  // Nearly identical implementation
}
```

**Proposed Solution:**

```javascript
// src/utils/directory-walker.js
class DirectoryWalker {
  static findAncestorDirectory(startPath, targetName) {
    let currentDir = path.resolve(startPath);
    const root = path.parse(currentDir).root;
    
    while (currentDir !== root) {
      const targetDir = path.join(currentDir, targetName);
      if (fs.existsSync(targetDir)) {
        return targetDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    return null;
  }
  
  static findGeeseDirectory(startPath) {
    return this.findAncestorDirectory(startPath, '.geese');
  }
}

// Usage:
const geeseDir = DirectoryWalker.findGeeseDirectory(workingDir);
```

---

### 4.3 Validation Logic Duplication

**Location:** Multiple classes validate frontmatter schema

**Problem:**
Schema validation appears in multiple forms across the codebase.

**Proposed Solution:**

```javascript
// src/validation/schema-validator.js
class SchemaValidator {
  static validate(data, schema) {
    const errors = [];
    
    // Check required fields
    for (const field of schema.required || []) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate field types
    for (const [field, value] of Object.entries(data)) {
      if (schema.types && schema.types[field]) {
        if (!this.validateType(value, schema.types[field])) {
          errors.push(`Invalid type for ${field}: expected ${schema.types[field]}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  static validateType(value, expectedType) {
    if (expectedType === 'array') return Array.isArray(value);
    if (expectedType === 'string') return typeof value === 'string';
    if (expectedType === 'number') return typeof value === 'number';
    if (expectedType === 'boolean') return typeof value === 'boolean';
    return true;
  }
}
```

---

## 5. Testing Challenges

### 5.1 Lack of Test Infrastructure

**Problem:**
- No unit test framework setup
- No test files exist
- No mocking utilities
- No test documentation

**Impact:** High - Can't verify refactoring doesn't break functionality

**Proposed Solution:**

Set up Jest or Mocha:

```bash
npm install --save-dev jest @types/jest
```

```javascript
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/**/*.test.js"
    ]
  }
}
```

**Example Test Structure:**

```
test/
├── unit/
│   ├── config-manager.test.js
│   ├── pipe-operations.test.js
│   ├── geese-parser.test.js
│   └── utils/
│       ├── object-path-helper.test.js
│       └── directory-walker.test.js
├── integration/
│   ├── run-command.test.js
│   ├── config-hierarchy.test.js
│   └── pipe-loading.test.js
└── fixtures/
    ├── sample.geese
    └── config/
        ├── global-config.json
        └── local-config.json
```

---

### 5.2 Hard-to-Test Singletons

**Problem:**
Singleton exports make unit testing difficult.

**Solution:**
Already covered in Section 1.1 - Export classes, not instances.

---

## 6. Architecture and Design Recommendations

### 6.1 Adopt Layered Architecture

**Proposed Structure:**

```
src/
├── domain/              # Core business logic (no dependencies)
│   ├── geese-file.js
│   ├── target-file.js
│   └── processing-session.js
├── application/         # Use cases/commands
│   ├── run-use-case.js
│   ├── create-geese-file-use-case.js
│   └── manage-config-use-case.js
├── infrastructure/      # External concerns
│   ├── file-system/
│   ├── cli/
│   └── persistence/
├── interfaces/          # Abstract contracts
└── utils/              # Shared utilities
```

**Benefits:**
- Clear separation of concerns
- Domain logic is portable
- Easy to test each layer independently
- Framework-agnostic core

---

### 6.2 Implement Dependency Injection Container

**Problem:**
Manual object creation and wiring throughout the codebase.

**Proposed Solution:**

```javascript
// src/container.js
class Container {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }
  
  register(name, factory, options = {}) {
    this.services.set(name, { factory, options });
  }
  
  get(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }
    
    // Return singleton if configured
    if (service.options.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory(this));
      }
      return this.singletons.get(name);
    }
    
    // Create new instance
    return service.factory(this);
  }
}

// Setup
const container = new Container();

container.register('configManager', () => new ConfigManager(), { singleton: true });
container.register('pipeOperations', () => new PipeOperations(), { singleton: true });
container.register('toolRegistry', () => new ToolRegistry(), { singleton: true });

container.register('parser', (c) => {
  return new GeeseParser(c.get('pipeOperations'));
});

container.register('reportGenerator', () => {
  return new ReportGenerator('./logs');
});

// Usage
const parser = container.get('parser');
const config = container.get('configManager');
```

---

### 6.3 Add Event System for Cross-Cutting Concerns

**Problem:**
Logging, progress updates, and error handling scattered throughout code.

**Proposed Solution:**

```javascript
// src/events/event-emitter.js
class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }
  
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(listener);
  }
  
  emit(event, data) {
    const listeners = this.listeners.get(event) || [];
    for (const listener of listeners) {
      listener(data);
    }
  }
}

// Usage
const events = new EventEmitter();

events.on('file:processing', (data) => {
  console.log(`Processing ${data.file}...`);
});

events.on('file:processed', (data) => {
  console.log(`✓ Processed ${data.file} in ${data.duration}ms`);
});

// In code:
events.emit('file:processing', { file: targetFile });
const result = await processFile(targetFile);
events.emit('file:processed', { file: targetFile, duration: result.duration });
```

---

## 7. Security Improvements

### 7.1 Centralize Security Validation

**Current State:**
Prototype pollution guards scattered across multiple files.

**Proposed Solution:**

```javascript
// src/security/input-validator.js
class InputValidator {
  static DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
  static DANGEROUS_PATTERNS = [
    /\.\./,           // Directory traversal
    /^\/etc\//,       // System directories
    /[<>]/,           // HTML tags
  ];
  
  static validateObjectPath(path) {
    const keys = path.split('.');
    for (const key of keys) {
      if (this.DANGEROUS_KEYS.includes(key)) {
        throw new SecurityError(`Dangerous key detected: ${key}`);
      }
    }
    return keys;
  }
  
  static validateFilePath(filePath) {
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(filePath)) {
        throw new SecurityError(`Dangerous path pattern detected: ${filePath}`);
      }
    }
    return filePath;
  }
  
  static sanitizeInput(input) {
    // Remove potential XSS/injection patterns
    return String(input)
      .replace(/[<>]/g, '')
      .trim();
  }
}

class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
  }
}
```

---

### 7.2 Add Rate Limiting for File Operations

**Problem:**
No protection against reading thousands of files.

**Proposed Solution:**

```javascript
// src/utils/rate-limiter.js
class RateLimiter {
  constructor(maxPerSecond = 100) {
    this.maxPerSecond = maxPerSecond;
    this.tokens = maxPerSecond;
    this.lastRefill = Date.now();
  }
  
  async acquire() {
    await this.refill();
    
    if (this.tokens < 1) {
      const waitTime = 1000 / this.maxPerSecond;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquire();
    }
    
    this.tokens--;
  }
  
  async refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = (timePassed / 1000) * this.maxPerSecond;
    
    this.tokens = Math.min(this.maxPerSecond, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// Usage
const limiter = new RateLimiter(50); // 50 files per second max

async function readFileWithLimit(filePath) {
  await limiter.acquire();
  return fs.readFile(filePath);
}
```

---

## 8. Performance Improvements

### 8.1 Add Caching Layer

**Problem:**
Configuration files and .geese files read multiple times.

**Proposed Solution:**

```javascript
// src/utils/cache.js
class Cache {
  constructor(ttl = 60000) { // 1 minute default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  clear() {
    this.cache.clear();
  }
}

// Usage in ConfigManager
class ConfigManager {
  constructor(cache = null) {
    this.cache = cache || new Cache();
  }
  
  async loadConfig() {
    const cached = this.cache.get('config');
    if (cached) return cached;
    
    const config = await this._loadConfigFromDisk();
    this.cache.set('config', config);
    return config;
  }
}
```

---

### 8.2 Lazy Load Custom Pipes

**Problem:**
All custom pipes loaded upfront even if not used.

**Proposed Solution:**

```javascript
class PipeOperations {
  constructor() {
    this.operations = new Map();
    this.lazyOperations = new Map(); // path -> not loaded yet
  }
  
  registerLazy(name, filePath) {
    this.lazyOperations.set(name, filePath);
  }
  
  get(name) {
    // Check if already loaded
    if (this.operations.has(name)) {
      return this.operations.get(name);
    }
    
    // Load lazily if registered
    if (this.lazyOperations.has(name)) {
      const filePath = this.lazyOperations.get(name);
      this.loadCustomPipe(filePath);
      this.lazyOperations.delete(name);
      return this.operations.get(name);
    }
    
    return undefined;
  }
}
```

---

## 9. Documentation Improvements

### 9.1 Add JSDoc Comments for All Public APIs

**Current State:**
Some files have JSDoc, others don't.

**Proposed Standard:**

```javascript
/**
 * Parse a .geese file and return structured data
 * 
 * @param {string} filePath - Absolute path to .geese file
 * @param {Object} [baseConfig={}] - Base configuration to merge with
 * @param {Object} [baseConfig.include] - Default include patterns
 * @param {Object} [baseConfig.exclude] - Default exclude patterns
 * 
 * @returns {ParsedGeeseFile} Parsed file data
 * @returns {Object} returns.frontmatter - Parsed frontmatter properties
 * @returns {string} returns.template - Template content
 * @returns {string} returns.filePath - Path to the file
 * @returns {string} returns.filename - Filename without extension
 * @returns {string} returns.fileDir - Directory containing the file
 * 
 * @throws {Error} If file doesn't exist or YAML is malformed
 * 
 * @example
 * const parser = new GeeseParser();
 * const data = parser.parseGeeseFile('./review.geese', { include: ['src/*.js'] });
 * console.log(data.frontmatter.$recipe);
 */
parseGeeseFile(filePath, baseConfig = {}) {
  // ...
}
```

---

### 9.2 Create Architecture Decision Records (ADRs)

Document key decisions in `docs/adr/`:

```markdown
# ADR-001: Use Singleton Exports

## Status
Deprecated - See ADR-015

## Context
Needed global access to shared instances...

## Decision
Exported singleton instances...

## Consequences
- (+) Easy access
- (-) Hard to test
- (-) Hidden dependencies
```

---

## 10. Priority Refactoring Roadmap

### Phase 1: Foundation (Week 1-2)
**Priority: Critical**

1. **Add Test Infrastructure**
   - Install Jest and configure package.json
   - Create test/ directory with unit/, integration/, fixtures/ subdirectories
   - Write initial tests for ConfigManager, PipeOperations, GeeseParser
   - Achieve 50% coverage of core modules
   - **Acceptance:** Jest runs successfully, 50%+ coverage on core modules

2. **Extract Utility Classes**
   - Create src/utils/object-path-helper.js with validatePath(), setNestedValue(), getNestedValue()
   - Create src/utils/directory-walker.js with findAncestorDirectory(), findGeeseDirectory()
   - Create src/utils/file-size-formatter.js with format(), getFileSize()
   - Replace all duplicate implementations with utility calls
   - **Acceptance:** No code duplication for these utilities, all tests pass

3. **Remove Singleton Exports**
   - Change module.exports from instances to classes in 3 files (tool-registry, pipe-operations, geese-file-finder)
   - Update all import sites to instantiate classes
   - Update tests to use dependency injection
   - **Acceptance:** All singleton exports removed, existing functionality preserved, tests pass

**Risk:** Medium - Breaks existing code but easy to fix

---

### Phase 2: Command Separation (Week 3-4)
**Priority: High**

1. **Break Up bin/geese.js**
   - Create bin/commands/ directory
   - Extract runCommand() to bin/commands/run-command.js
   - Extract newCommand() to bin/commands/new-command.js
   - Extract configCommand() to bin/commands/config-command.js
   - Extract pipe commands to bin/commands/pipe-command.js
   - Extract launchEditor() to bin/utils/editor-launcher.js
   - Reduce bin/geese.js from 747 lines to <100 lines
   - **Acceptance:** bin/geese.js < 100 lines, all commands in separate files, all functionality works

2. **Create Command Pattern**
   - Create BaseCommand class with execute() method signature
   - Implement RunCommand, NewCommand, ConfigCommand, PipeCommand extending BaseCommand
   - Each command handles its own validation and error handling
   - **Acceptance:** All commands extend BaseCommand, consistent error handling, tests for each command

**Risk:** Low - Well-isolated changes

---

### Phase 3: Core Refactoring (Week 5-8)
**Priority: High**

1. **Refactor PipeOperations**
   - Create src/pipe-operations/ directory
   - Extract StringOperations, FileOperations, ListOperations, TypeOperations, RegexOperations, UtilityOperations to separate files
   - Create PipeRegistry class (registration, lookup) ~100 lines
   - Create PipeLoader class (filesystem loading) ~100 lines
   - Create PipeChainExecutor class (chain execution) ~100 lines
   - Reduce main file from 577 to <150 lines
   - **Acceptance:** pipe-operations/ directory exists, 6 operation category files, main class <150 lines, all pipe operations work, tests pass

2. **Refactor ConfigManager**
   - Create src/config/ directory
   - Extract ConfigFileIO class (load/save to disk) ~80 lines
   - Extract ConfigHierarchy class (hierarchical loading) ~120 lines
   - Extract ConfigMerger class (deep merge logic) ~60 lines
   - Use NestedObjectAccessor from Phase 1
   - Reduce ConfigManager from 442 to <150 lines
   - **Acceptance:** config/ directory exists, 3 extracted classes, ConfigManager <150 lines, all config operations work, tests pass

3. **Refactor GeeseParser**
   - Inject PipeOperations instance via constructor
   - Extract TemplateRenderer class (Handlebars operations)
   - Extract ContextBuilder class (prepareContext logic)
   - Remove direct require() of pipe-operations
   - **Acceptance:** No global dependencies, injected dependencies, extracted classes, all parsing works, tests pass

**Risk:** Medium-High - Core functionality, needs thorough testing

---

### Phase 4: Architecture Improvements (Week 9-12)
**Priority: Medium**

1. **Implement Dependency Injection**
   - Create src/container.js with register() and get() methods
   - Register all services (configManager, pipeOperations, parser, reportGenerator, toolRegistry)
   - Update command handlers to use container
   - Remove manual instantiation from commands
   - **Acceptance:** Container class exists, all services registered, commands use container, tests with mocked container pass

2. **Add Interface Definitions**
   - Create src/interfaces/ directory
   - Define IConfigProvider, IFileFinder, IReportGenerator, IPipeOperation base classes
   - Document required methods with JSDoc and throws Error if not implemented
   - Update existing implementations to extend interfaces
   - **Acceptance:** 4 interface files exist, all implementations extend interfaces, interface documentation complete

3. **Implement Event System**
   - Create src/events/event-emitter.js with on(), emit(), off() methods
   - Add events: file:processing, file:processed, config:loaded, pipe:executed
   - Update core operations to emit events
   - Add event listeners in commands for logging and progress
   - **Acceptance:** EventEmitter class exists, 4+ events defined, operations emit events, commands listen to events

**Risk:** Low-Medium - Additive changes

---

### Phase 5: Security & Performance (Week 13-14)
**Priority: Medium**

1. **Centralize Security**
   - Create src/security/input-validator.js with validateObjectPath(), validateFilePath(), sanitizeInput()
   - Create SecurityError class extending Error
   - Replace all prototype pollution guards with InputValidator calls
   - Add input sanitization to all user input paths
   - **Acceptance:** InputValidator class exists, SecurityError defined, all validation uses centralized logic, security tests pass

2. **Add Caching**
   - Create src/utils/cache.js with set(), get(), clear(), TTL support
   - Add cache to ConfigManager.loadConfig()
   - Add cache to GeeseParser.parseGeeseFile() for repeated files
   - Measure performance improvement (expect 30-50% reduction in repeated operations)
   - **Acceptance:** Cache class exists, ConfigManager and Parser use caching, performance metrics show improvement

3. **Add Rate Limiting**
   - Create src/utils/rate-limiter.js with acquire(), refill() methods
   - Apply to file read operations in pipe-operations readFile
   - Configure default limit of 100 operations/second
   - Add tests to verify rate limiting works
   - **Acceptance:** RateLimiter class exists, file operations rate-limited, tests verify limits enforced

**Risk:** Low - Mostly additive

---

## 11. Metrics and Success Criteria

### Code Quality Metrics

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Average Lines per File | 258 | <200 | High |
| Average Methods per Class | 22 | <15 | High |
| Cyclomatic Complexity (bin/geese.js) | 107 | <30 | High |
| Cyclomatic Complexity (avg other files) | 60 | <20 | Medium |
| Test Coverage | 0% | >80% | Critical |
| Duplicate Code | ~15% | <5% | Medium |
| Singleton Exports | 3 | 0 | High |
| God Classes (>300 lines) | 4 | 0 | High |
| Direct Dependencies | 25+ | <10 | Medium |

### Refactoring Goals

- [ ] All classes under 200 lines
- [ ] All methods under 30 lines
- [ ] No singleton exports
- [ ] 80%+ test coverage
- [ ] All public APIs have JSDoc
- [ ] No code duplication >10 lines
- [ ] All dependencies injected
- [ ] Clear separation of concerns

---

## 12. Benefits of Refactoring

### Immediate Benefits

1. **Testability**
   - Can unit test individual components
   - Easier to mock dependencies
   - Faster test execution

2. **Maintainability**
   - Easier to find and fix bugs
   - Clearer code organization
   - Better code navigation

3. **Extensibility**
   - Easy to add new commands
   - Easy to add new pipe operations
   - Easy to add new tools (beyond goose)

### Long-term Benefits

1. **Team Scalability**
   - Multiple developers can work in parallel
   - Clear boundaries reduce conflicts
   - Easier onboarding

2. **Feature Velocity**
   - Less time debugging
   - More time on features
   - Confident refactoring

3. **Quality**
   - Fewer bugs
   - Better error handling
   - More robust security

---

## 13. Risks and Mitigation

### Risk: Breaking Existing Functionality

**Mitigation:**
- Implement comprehensive tests BEFORE refactoring
- Refactor incrementally
- Keep old code temporarily with deprecation warnings
- Use feature flags for new implementations

### Risk: Time Investment

**Mitigation:**
- Phase the work (critical first, nice-to-have last)
- Continue feature work in parallel
- Dedicate specific refactoring sprints

### Risk: Team Resistance

**Mitigation:**
- Document clear benefits
- Show metrics improvement
- Get team buy-in early
- Start with least controversial changes

---

## 14. Conclusion

The Geese project has a solid foundation with good ideas (hierarchical configuration, extensible tools, pipe operations). However, it suffers from common technical debt issues:

1. **Tight coupling** between modules makes testing and extension difficult
2. **Large classes** with multiple responsibilities violate SRP
3. **Singleton instances** create hidden dependencies and global state
4. **Code duplication** across configuration and validation logic
5. **Missing test infrastructure** makes refactoring risky

The proposed refactoring will:
- **Improve testability** through dependency injection and smaller classes
- **Enhance maintainability** through clear separation of concerns
- **Increase extensibility** through interfaces and loose coupling
- **Reduce bugs** through better architecture and tests
- **Speed up development** through clearer code organization

Following the phased roadmap will allow incremental improvement without disrupting ongoing feature work.

---

## Appendix A: Quick Wins (Can be done immediately)

1. **Extract ObjectPathHelper** (2 hours)
   - Eliminates duplication
   - Easy to test
   - Low risk

2. **Extract DirectoryWalker** (1 hour)
   - Eliminates duplication
   - Single responsibility
   - Zero risk

3. **Add JSDoc to public APIs** (4 hours)
   - Improves documentation
   - No code changes
   - Zero risk

4. **Setup Jest** (2 hours)
   - Enables testing
   - Foundation for everything else
   - Zero risk

Total Time: ~9 hours
Risk: Minimal
Benefit: Foundation for all other improvements

---

## Appendix B: Resources

### Books
- "Refactoring" by Martin Fowler
- "Clean Code" by Robert Martin
- "Working Effectively with Legacy Code" by Michael Feathers

### Tools
- **Jest**: Testing framework
- **ESLint**: Linting and code quality
- **SonarQube**: Code quality metrics
- **Istanbul/nyc**: Coverage reporting

### Patterns
- **Dependency Injection**: Reduces coupling
- **Strategy Pattern**: For pipe operations
- **Command Pattern**: For CLI commands
- **Repository Pattern**: For data access
- **Service Locator**: For dependency management

---

**Last Updated:** 2024-12-03  
**Review Date:** 2024-12-17  
**Owner:** Development Team
