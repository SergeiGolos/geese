# Interfaces

This directory contains interface definitions (abstract base classes) for core abstractions in the Geese project. These interfaces enforce contracts and enable the Dependency Inversion Principle.

## Purpose

Interfaces serve several purposes:

1. **Contract Enforcement**: Ensure implementations provide required methods
2. **Documentation**: Define expected behavior and method signatures
3. **Testability**: Enable mocking and dependency injection
4. **Extensibility**: Allow alternative implementations
5. **Type Safety**: Catch missing implementations at runtime

## Available Interfaces

### IConfigProvider

**File:** `config-provider.js`  
**Purpose:** Define contract for configuration management

**Methods:**
- `loadConfig()` - Load configuration from storage
- `saveConfig(config)` - Save configuration to storage
- `get(key)` - Get configuration value by key path
- `set(key, value)` - Set configuration value by key path
- `delete(key)` - Delete configuration value by key path
- `list()` - List all configuration keys

**Implementation:** `ConfigManager` in `../config-manager.js`

**Example:**
```javascript
const IConfigProvider = require('./interfaces/config-provider');

class MyConfigProvider extends IConfigProvider {
  async loadConfig() {
    // Implementation
  }
  
  async saveConfig(config) {
    // Implementation
  }
  
  // ... implement other required methods
}
```

### IFileFinder

**File:** `file-finder.js`  
**Purpose:** Define contract for file discovery operations

**Methods:**
- `discoverGeeseFiles(workingDir)` - Discover .geese files in hierarchical order
- `findGeeseInDirectory(dir, recursive)` - Find .geese files in a directory

**Implementation:** `GeeseFileFinder` in `../geese-file-finder.js`

**Example:**
```javascript
const IFileFinder = require('./interfaces/file-finder');

class CustomFileFinder extends IFileFinder {
  async discoverGeeseFiles(workingDir) {
    // Return array of { path, source, priority } objects
  }
  
  async findGeeseInDirectory(dir, recursive = true) {
    // Return array of file paths
  }
}
```

### IReportGenerator

**File:** `report-generator.js`  
**Purpose:** Define contract for report generation

**Methods:**
- `createSessionEntry(geeseFile, targetFile, context, prompt, response, startTime, endTime)` - Create a session entry
- `saveReport(sessions, options)` - Save report with session entries

**Implementation:** `ReportGenerator` in `../report-generator.js`

**Example:**
```javascript
const IReportGenerator = require('./interfaces/report-generator');

class JsonReportGenerator extends IReportGenerator {
  createSessionEntry(geeseFile, targetFile, context, prompt, response, startTime, endTime) {
    return {
      file: geeseFile,
      target: targetFile,
      duration: endTime - startTime
      // ... other fields
    };
  }
  
  async saveReport(sessions, options = {}) {
    const reportPath = './report.json';
    await fs.writeFile(reportPath, JSON.stringify(sessions, null, 2));
    return reportPath;
  }
}
```

### IPipeOperation

**File:** `pipe-operation.js`  
**Purpose:** Define contract for pipe operations (Strategy Pattern)

**Methods:**
- `getName()` - Return operation name (required)
- `execute(value, args, context)` - Execute the operation (required)
- `validateArgs(args)` - Validate operation arguments (optional, default: true)
- `getMetadata()` - Provide operation metadata (optional)

**Usage:** Create custom pipe operations

**Example:**
```javascript
const IPipeOperation = require('./interfaces/pipe-operation');

class TrimOperation extends IPipeOperation {
  getName() {
    return 'trim';
  }
  
  execute(value, args, context) {
    return String(value).trim();
  }
  
  validateArgs(args) {
    return args.length === 0; // Trim takes no arguments
  }
  
  getMetadata() {
    return {
      name: 'trim',
      description: 'Remove whitespace from string',
      examples: ['{{ value | trim }}'],
      args: []
    };
  }
}
```

See [`docs/CUSTOM_PIPE_OPERATIONS.md`](../../docs/CUSTOM_PIPE_OPERATIONS.md) for detailed guide.

## Benefits of Using Interfaces

### 1. Dependency Inversion

Depend on abstractions, not concrete implementations:

```javascript
// Bad: Depends on concrete class
class MyApp {
  constructor() {
    this.config = new ConfigManager(); // Tight coupling
  }
}

// Good: Depends on interface
class MyApp {
  constructor(configProvider = new ConfigManager()) {
    this.config = configProvider; // Loose coupling, testable
  }
}
```

### 2. Easy Testing

Mock interfaces for testing:

```javascript
// Test double for IConfigProvider
class MockConfigProvider extends IConfigProvider {
  constructor(mockData = {}) {
    super();
    this.data = mockData;
  }
  
  async loadConfig() {
    return this.data;
  }
  
  async get(key) {
    return this.data[key];
  }
  
  // ... implement other methods with mock behavior
}

// Use in tests
const mockConfig = new MockConfigProvider({ tool: 'goose' });
const app = new MyApp(mockConfig);
```

### 3. Alternative Implementations

Easily swap implementations:

```javascript
// Different storage backends
class FileConfigProvider extends IConfigProvider { /* ... */ }
class DatabaseConfigProvider extends IConfigProvider { /* ... */ }
class MemoryConfigProvider extends IConfigProvider { /* ... */ }

// All work with same interface
const config = process.env.NODE_ENV === 'test'
  ? new MemoryConfigProvider()
  : new FileConfigProvider();
```

### 4. Contract Enforcement

Interfaces throw errors if methods are not implemented:

```javascript
class IncompleteProvider extends IConfigProvider {
  // Forgot to implement required methods!
}

const provider = new IncompleteProvider();
await provider.loadConfig(); // Error: loadConfig() must be implemented by subclass
```

## Design Principles

These interfaces follow SOLID principles:

- **S**ingle Responsibility: Each interface has one clear purpose
- **O**pen/Closed: Open for extension (new implementations), closed for modification
- **L**iskov Substitution: Implementations can be substituted for the interface
- **I**nterface Segregation: Interfaces are focused, not bloated
- **D**ependency Inversion: Depend on abstractions (interfaces), not concretions

## Testing Interfaces

All interfaces have comprehensive tests in `test-interfaces.js`:

```bash
npm test
```

Tests verify:
- Methods throw errors if not implemented
- Existing implementations extend interfaces correctly
- All required methods are present
- Interface contracts are enforced

## Migration Guide

To migrate existing code to use interfaces:

1. **Identify abstractions** - What concepts need interfaces?
2. **Define interface** - Create interface with required methods
3. **Update implementation** - Extend interface, call `super()` in constructor
4. **Update consumers** - Accept interface type, not concrete class
5. **Add tests** - Verify interface is properly implemented

Example migration:

```javascript
// Before
class MyService {
  constructor() {
    this.config = new ConfigManager(); // Direct dependency
  }
}

// After
class MyService {
  constructor(configProvider = new ConfigManager()) {
    this.config = configProvider; // Interface dependency
  }
}
```

## Future Enhancements

Potential additions to the interface system:

1. **IPipeLoader** - Interface for loading custom pipes
2. **IToolRunner** - Interface for CLI tool runners (beyond CLIRunner)
3. **IValidator** - Interface for schema validators
4. **ITemplateEngine** - Interface for template engines (beyond Handlebars)
5. **ILogger** - Interface for logging implementations

## Resources

- [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
- [Strategy Pattern](https://en.wikipedia.org/wiki/Strategy_pattern)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Custom Pipe Operations Guide](../../docs/CUSTOM_PIPE_OPERATIONS.md)

## Contributing

When adding new interfaces:

1. Create interface file in this directory
2. Add comprehensive JSDoc comments
3. Include usage examples
4. Update this README
5. Add tests to `test-interfaces.js`
6. Update implementations to extend interface
7. Document in `TECHNICAL_DEBT.md` if applicable
